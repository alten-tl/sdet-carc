# Deployment

The whole system is deployed with **Serverless Framework** into a single
CloudFormation stack per stage.

## The deployed environment

| Property | Value |
| --- | --- |
| Account | `550711951109` |
| Region | `us-east-1` |
| Stage | `dev` |
| Stack | `appointments-dev` |
| Public endpoint | <https://5sg14jfok6.execute-api.us-east-1.amazonaws.com> |
| Interactive documentation | <https://5sg14jfok6.execute-api.us-east-1.amazonaws.com/api/docs> |
| OpenAPI document | <https://5sg14jfok6.execute-api.us-east-1.amazonaws.com/api/openapi.json> |

```mermaid
flowchart TB
    subgraph stack["CloudFormation stack: appointments-dev"]
        apigw["🌐 API Gateway HTTP API<br/><i>$default stage, CORS enabled</i>"]
        api["⚡ appointments-dev-api<br/><i>1024 MB · 29 s · nodejs22.x</i>"]
        svc["⚡ appointments-dev-appointments<br/><i>512 MB · 30 s · concurrency 10</i>"]
        mig["⚡ appointments-dev-migrate<br/><i>512 MB · 120 s</i>"]
        seed["⚡ appointments-dev-seed<br/><i>512 MB · 120 s</i>"]
        role["🔑 IAM role<br/><i>lambda:InvokeFunction<br/>secretsmanager:GetSecretValue</i>"]
    end
    sm["🔐 Secrets Manager<br/>appointments/database-url"]
    pg[("🖥️ PostgreSQL 18 (Coolify)")]
    cw["📊 CloudWatch Logs (14 d) + X-Ray"]

    apigw --> api
    api -->|"InvokeCommand"| svc
    svc --> sm
    svc --> pg
    mig --> sm
    seed --> sm
    api -.-> cw
    svc -.-> cw

    style stack fill:#f7f7f7,stroke:#999,color:#000
    style apigw fill:#232f3e,stroke:#ff9900,color:#fff
    style api fill:#ff9900,stroke:#232f3e,color:#fff
    style svc fill:#ff9900,stroke:#232f3e,color:#fff
    style mig fill:#e8f4fd,stroke:#2e73b8,color:#000
    style seed fill:#e8f4fd,stroke:#2e73b8,color:#000
    style sm fill:#dd344c,stroke:#232f3e,color:#fff
    style pg fill:#2e73b8,stroke:#232f3e,color:#fff
```

## The functions

| Function | Handler | Memory | Timeout | Trigger |
| --- | --- | --- | --- | --- |
| `api` | `dist/api/api-lambda.apiLambdaHandler` | 1024 MB | 29 s | API Gateway (`*`) |
| `appointments` | `dist/bundle/handler.appointmentsLambdaHandler` | 512 MB | 30 s | `lambda:Invoke` from `api` |
| `migrate` | `dist/bundle/handlers/migrate-handler.migrateHandler` | 512 MB | 120 s | The pipeline |
| `seed` | `dist/bundle/handlers/seed-handler.seedHandler` | 512 MB | 120 s | Manual |

The API timeout is 29 seconds because API Gateway caps the request at 30: the
function has to answer before the gateway gives up.

## The CI/CD pipeline

```mermaid
flowchart TB
    push(["push to dev / qa / master"]) --> ci["🧪 CI · verify<br/>lint · build · unit tests · acceptance tests"]
    ci -->|"✅ success"| cd["🚀 CD · deploy<br/>bundle → OIDC → serverless deploy"]
    cd --> mig["🗄️ migrate<br/>invoke the migrate function"]
    mig --> smoke["🔎 smoke test<br/>GET /api/v1/appointments"]
    smoke --> summary["📋 summary published in the run"]
    ci -->|"❌ failure"| stop["⛔ the deployment never starts"]

    style push fill:#f5f5f5,stroke:#333,color:#000
    style ci fill:#e8f4fd,stroke:#2e73b8,color:#000
    style cd fill:#fff4e6,stroke:#ff9900,color:#000
    style stop fill:#ffd7d7,stroke:#c00,color:#000
    style summary fill:#d7f5dd,stroke:#2b7,color:#000
```

| Workflow | File | Trigger | Job |
| --- | --- | --- | --- |
| CI | `.github/workflows/ci.yml` | Push and pull request | `verify` (also reusable) |
| CD | `.github/workflows/cd.yml` | Push to `dev`, `qa`, `master` and manual | `verify` → `deploy` |

The CD **reuses** the CI workflow as a gate (`needs: verify`), so code that
does not pass the tests is never deployed.

### Stages

| Branch | Stage | Stack |
| --- | --- | --- |
| `dev` | `dev` | `appointments-dev` |
| `qa` | `qa` | `appointments-qa` |
| `master` | `prod` | `appointments-prod` |

## Authentication: OIDC without static keys

```mermaid
flowchart LR
    gh["GitHub Actions"] -->|"id-token: write"| oidc["GitHub OIDC"]
    oidc -->|"JWT (sub = repo:…:ref:refs/heads/dev)"| sts["AWS STS"]
    sts -->|"temporary credentials"| gh
    gh -->|"serverless deploy"| aws["☁️ AWS"]

    style gh fill:#232f3e,stroke:#ff9900,color:#fff
    style sts fill:#5a3d5a,stroke:#232f3e,color:#fff
```

The repository only stores the **ARN of the role**
(`arn:aws:iam::550711951109:role/appointments-deploy`), which is an
identifier, not a credential. See
[ADR 0009](../decisions/0009-oidc-and-secrets-manager.md).

### Limitation: no GitHub environments

The repository does not allow creating **GitHub environments**, so the
workflow cannot use the strictest mode (an environment can require reviewers
and hold its own secrets). The workflow therefore assumes the role with the
**branch** subject (`ref:refs/heads/<branch>`) instead of the environment one.

```mermaid
flowchart TB
    subgraph ideal["✅ Ideal (not available today)"]
        i1["environment: dev"] --> i2["sub = repo:…:environment:dev"] --> i3["Protected by the environment rules<br/>and its own secrets"]
    end
    subgraph actual["⚙️ Current"]
        a1["no environment"] --> a2["sub = repo:…:ref:refs/heads/dev"] --> a3["Any push to dev can deploy to dev"]
    end

    style ideal fill:#d7f5dd,stroke:#2b7,color:#000
    style actual fill:#ffe9c2,stroke:#d58512,color:#000
```

The trust policy of the role **accepts both subjects**, so enabling the
environments later is a one line change in `cd.yml` and no change in AWS:

```yaml
jobs:
  deploy:
    environment: ${{ env.STAGE }}
```

## The secret of the database

| Property | Value |
| --- | --- |
| Name | `appointments/database-url` |
| Payload | `{"DATABASE_URL": "postgres://…"}` |
| Created by | `scripts/create-database-secret.sh` (asks for the password without echoing it) |
| Read by | The `appointments`, `migrate` and `seed` functions |

```mermaid
flowchart LR
    script["scripts/create-database-secret.sh"] -->|"put-secret-value"| sm["🔐 Secrets Manager"]
    sm -->|"GetSecretValue (IAM)"| svc["⚡ appointments"]
    sm --> mig["⚡ migrate"]
    sm --> seed["⚡ seed"]

    style sm fill:#dd344c,stroke:#232f3e,color:#fff
```

The `api` function has **no** permission over the secret: it never talks to
the database.

## Packaging

```mermaid
flowchart LR
    src["src/**"] --> rspack["rspack<br/><i>SWC, decoratorMetadata</i>"] --> apibundle["dist/api/api-lambda.js<br/><i>5.3 MB</i>"]
    src --> esbuild["esbuild<br/><i>--bundle --platform=node</i>"] --> svcbundle["dist/bundle/*.js<br/><i>14 MB</i>"]
    apibundle --> zip["📦 appointments.zip<br/><i>4.1 MB compressed</i>"]
    svcbundle --> zip
    zip --> lambda["☁️ Lambda"]

    style zip fill:#d7f5dd,stroke:#2b7,color:#000
```

Only the built artifacts travel: `package.patterns` excludes everything else
from the zip. The first attempt, which shipped the `node_modules` of pnpm,
produced a 589 MB package that AWS would have rejected.

## Deploying by hand

```bash
export PATH="$HOME/.local/aws-cli/v2/current/bin:$PATH"

pnpm bundle:lambda && pnpm build:api-lambda
npx serverless deploy --stage dev --region us-east-1
npx serverless invoke --function migrate --stage dev --data '{}'
npx serverless invoke --function seed    --stage dev --data '{}'
```

## Rolling back

```mermaid
flowchart LR
    a["1 · Fix the code<br/>and commit"] --> b["2 · Redeploy the previous commit<br/>git revert + push"]
    b --> c["3 · The migrations are not reverted<br/>they are forward compatible"]
    c --> d["4 · If the schema must be reverted<br/>pnpm db:revert locally<br/>and invoke it manually"]

    style a fill:#e8f4fd,stroke:#2e73b8,color:#000
    style d fill:#ffe9c2,stroke:#d58512,color:#000
```

## Related documents

- [../operations/runbook.md](../operations/runbook.md) — the operational
  procedures.
- [../operations/costs.md](../operations/costs.md) — what this costs.
- [ADR 0004](../decisions/0004-infrastructure-as-code.md) — why Serverless
  Framework.
- [ADR 0008](../decisions/0008-bundling-strategies.md) — why two bundlers.
