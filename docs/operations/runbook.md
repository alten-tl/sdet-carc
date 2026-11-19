# Runbook

The operational procedures of the Appointments API.

## The environment at a glance

| Property | Value |
| --- | --- |
| Account | `550711951109` |
| Region | `us-east-1` |
| Stage | `dev` |
| Stack | `appointments-dev` |
| Endpoint | <https://5sg14jfok6.execute-api.us-east-1.amazonaws.com> |
| Documentation | <https://5sg14jfok6.execute-api.us-east-1.amazonaws.com/api/docs> |
| Database | PostgreSQL 18 in Coolify (`coolify.sdkdomains.com:5432`, database `appointments`) |
| Secret | `appointments/database-url` in AWS Secrets Manager |
| Deployment role | `arn:aws:iam::550711951109:role/appointments-deploy` (GitHub OIDC) |

## Everyday commands

```bash
export PATH="$HOME/.local/aws-cli/v2/current/bin:$PATH"

# what is deployed
aws lambda list-functions --query "Functions[?contains(FunctionName,'dev')].FunctionName" --output text
npx serverless info --stage dev --region us-east-1

# the public URL
aws cloudformation describe-stacks \
  --stack-name appointments-dev \
  --query "Stacks[0].Outputs[?OutputKey=='HttpApiUrl'].OutputValue" \
  --output text
```

## Deploying

```mermaid
flowchart LR
    a["1 · Verify locally<br/>pnpm lint && pnpm test:coverage && pnpm test:bdd"] --> b["2 · Build the artifacts<br/>pnpm bundle:lambda && pnpm build:api-lambda"]
    b --> c["3 · Deploy<br/>npx serverless deploy --stage dev"]
    c --> d["4 · Migrate<br/>npx serverless invoke --function migrate"]
    d --> e["5 · Verify<br/>curl the endpoint"]

    style a fill:#e8f4fd,stroke:#2e73b8,color:#000
    style e fill:#d7f5dd,stroke:#2b7,color:#000
```

```bash
pnpm lint && pnpm test:coverage && pnpm test:bdd

pnpm bundle:lambda && pnpm build:api-lambda
npx serverless deploy --stage dev --region us-east-1
npx serverless invoke --function migrate --stage dev --region us-east-1 --data '{}'
npx serverless invoke --function seed    --stage dev --region us-east-1 --data '{}'

curl "https://5sg14jfok6.execute-api.us-east-1.amazonaws.com/api/v1/appointments?date=2026-01-15"
```

The pipeline does exactly this automatically after the CI passes.

## Migrations

```mermaid
flowchart TB
    m["Migration file<br/><i>src/lambda/.../migrations/**</i>"] --> l["Applied locally<br/>pnpm db:migrate"]
    m --> a["Applied in AWS<br/>invoke the migrate function"]
    l --> db[("PostgreSQL")]
    a --> db

    style m fill:#e8f4fd,stroke:#2e73b8,color:#000
    style db fill:#2e73b8,stroke:#232f3e,color:#fff
```

```bash
# locally
pnpm db:migrate
pnpm db:revert      # undo the last one

# in AWS
npx serverless invoke --function migrate --stage dev --data '{}'
```

The migration runner applies **only the pending** migrations and records them
in the `migrations` table, so running it twice is harmless. The pipeline
invokes it right after the deployment: if it fails, the deployment is marked
as failed.

## Seeding the demonstration data

```bash
npx serverless invoke --function seed --stage dev --data '{}'
```

The seed is idempotent (it upserts by id), so it can be run again at any time
to restore the demonstration scenario.

## Reading the logs

```bash
# the live tail of the API
aws logs tail /aws/lambda/appointments-dev-api --format short --since 10m

# the live tail of the service
aws logs tail /aws/lambda/appointments-dev-appointments --format short --since 10m

# the errors of the last hour
aws logs filter-log-events \
  --log-group-name /aws/lambda/appointments-dev-api \
  --start-time $(( ($(date +%s) - 3600) * 1000 )) \
  --filter-pattern '?ERROR'
```

The logs contain the X-Ray trace id of each invocation, which links the API
and the service in the X-Ray console.

## Troubleshooting

```mermaid
flowchart TB
    err["❌ The endpoint fails"] --> c1{"Status?"}
    c1 -->|"502"| c2["The service is not answering<br/>→ check its logs and the reserved concurrency"]
    c1 -->|"409"| c3["The slot is taken<br/>→ this is the expected behaviour"]
    c1 -->|"500"| c4["An unexpected error<br/>→ read the ERROR logs"]
    c1 -->|"404"| c5["Wrong path or wrong id"]
    c1 -->|"timeout"| c6["Cold start + a slow database<br/>→ check the connection pool and the RDS proxy"]

    style err fill:#ffd7d7,stroke:#c00,color:#000
    style c3 fill:#d7f5dd,stroke:#2b7,color:#000
```

| Symptom | Likely cause | Action |
| --- | --- | --- |
| `502 LAMBDA_INVOCATION_FAILED` | The service timed out or is throttled | Check the logs of `appointments-dev-appointments` and the reserved concurrency (10) |
| `409 SLOT_NOT_AVAILABLE` on a free slot | The exclusion constraint found an overlap | Check the timezone of the client and `SLOT_DURATION_MINUTES` |
| The `migrate` function fails | The database is unreachable or the secret is wrong | `aws secretsmanager get-secret-value --secret-id appointments/database-url` and check the security group of the database |
| The deployment fails with `CREATE_FAILED` | A reserved environment variable was set | `AWS_REGION` is set by the runtime and cannot be overridden |
| The deployment fails with `UPDATE_ROLLBACK_COMPLETE` | A previous failed deployment is still rolling back | Wait a couple of minutes and deploy again |
| The package is rejected | The zip is too big | Check `package.patterns`: only `dist/api/**` and `dist/bundle/**` must travel |

## Rotating the database password

```mermaid
flowchart LR
    a["1 · Change the password in the database"] --> b["2 · Update the secret<br/>put-secret-value"]
    b --> c["3 · The next invocation reads the new value<br/><i>no deployment needed</i>"]

    style c fill:#d7f5dd,stroke:#2b7,color:#000
```

```bash
./scripts/create-database-secret.sh   # asks for the new password
```

The secret is read on every invocation, so the change takes effect
immediately.

## Rotating the deployment credentials

The pipeline uses **OIDC**, so there is nothing to rotate: the credentials are
temporary and the trust policy is the only thing that can be changed.

```bash
# restrict the deployments to a single branch
GITHUB_OWNER="alten-tl" GITHUB_REPO="sdet-carc" DEPLOY_BRANCHES="dev" ./scripts/bootstrap-aws.sh
```

## Revoking the bootstrap user

The `bootstrap` IAM user was only needed to create the OIDC provider and the
role. Once the pipeline works, it can be removed:

```mermaid
flowchart LR
    a["IAM → Users → bootstrap"] --> b["Security credentials"] --> c["Revoke the access key"] --> d["Delete the user"]

    style d fill:#d7f5dd,stroke:#2b7,color:#000
```

## Rolling back

```bash
git revert <sha>              # or git revert a range
git push origin dev           # the pipeline redeploys the previous code
```

The migrations are **not** reverted automatically: they are forward
compatible by design (a new column is added with a default). If a schema
revert is really needed:

```bash
pnpm db:revert                # locally, against the same database
npx serverless invoke --function migrate --stage dev --data '{}'
```

## Creating a new stage

```bash
npx serverless deploy --stage qa --region us-east-1
npx serverless invoke --function migrate --stage qa --data '{}'
```

A stage needs its own secret (`DATABASE_SECRET_NAME` overrides the default
`appointments/database-url`) if it points to a different database.

## Related documents

- [../architecture/deployment.md](../architecture/deployment.md) — the
  topology and the pipeline.
- [costs.md](costs.md) — the cost of the stack.
