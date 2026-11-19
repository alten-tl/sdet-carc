# Appointments API

REST API to manage vehicle repair-shop appointments, deployed on AWS with
Serverless Framework. The public API and the business logic run in **two
separate Lambda functions**, and PostgreSQL holds the data.

- **Public API** (Lambda + API Gateway HTTP API): validates the HTTP contract
  and answers with RFC 9457 problem details.
- **Appointments service** (Lambda): owns the domain rules and talks to
  PostgreSQL. It is invoked synchronously through the Lambda Invoke API.
- **PostgreSQL**: the source of truth.

## Architecture

```
            ┌────────────────────┐
 client ──▶ │ API Gateway (HTTP) │
            └─────────┬──────────┘
                      │ REST (NestJS)
            ┌─────────▼──────────┐
            │ Lambda: api        │  validation, RFC 9457 errors, OpenAPI
            └─────────┬──────────┘
                      │ lambda:Invoke (RequestResponse)
            ┌─────────▼──────────┐
            │ Lambda: appointments│  domain rules, use cases, persistence
            └─────────┬──────────┘
                      │ PostgreSQL (TLS)
            ┌─────────▼──────────┐
            │ PostgreSQL 17      │
            └────────────────────┘
```

The API never touches the database: it only knows the command contract
(`src/contracts`). The Lambda functions never know about HTTP: they exchange
`CommandEnvelope` messages (`{ type, payload }`) and answer with
`CommandResult` (`{ ok, data }` or `{ ok, error }`).

### Project layout

```
src/
├── api/            # HTTP layer (NestJS): controllers, filters, Swagger
│   ├── application/    # use cases + ports used by the API
│   ├── errors/         # RFC 9457 problem details
│   └── outbound/       # Lambda Invoke gateway (the API's only dependency)
├── contracts/      # Shared contracts: commands, payloads, errors, problems
├── lambda/         # Business layer: domain, application, infrastructure
└── tools/          # Local tooling: migrations, seed, local Lambda runtime
```

The dependency rule is enforced by `pnpm lint`
(`src/tools/check-boundaries.ts`):

| From         | Allowed to import                       |
| ------------ | --------------------------------------- |
| `api`        | `contracts`, `lambda`                   |
| `lambda`     | `contracts`                             |
| `contracts`  | nothing                                 |

## Requirements

- Node.js 24 (the deployed functions run on the AWS Node.js 22 runtime)
- pnpm 10
- Docker (PostgreSQL 17 for local development, testcontainers for the
  acceptance tests)

## Local development

```bash
pnpm install
cp .env.example .env

docker compose up -d postgres   # PostgreSQL 17 on localhost:5432

pnpm db:migrate                  # apply the migrations
pnpm db:seed                     # load the demonstration data

pnpm local:lambda                # local Lambda runtime on :3001
pnpm start:dev                   # REST API on :3000
```

The API reaches the Lambda function through the AWS SDK. With
`LAMBDA_ENDPOINT=http://localhost:3001` the invocation is sent to the local
runtime instead of AWS, so the whole flow can be exercised without deploying
anything.

- REST API: <http://localhost:3000/api/v1/appointments>
- OpenAPI document: <http://localhost:3000/api/openapi.json>
- Interactive documentation: <http://localhost:3000/api/docs>

### Configuration

| Variable                 | Used by            | Description                                            |
| ------------------------ | ------------------ | ------------------------------------------------------ |
| `DATABASE_URL`           | Lambda, tools      | PostgreSQL connection string (local development)        |
| `DATABASE_SECRET_ID`     | Lambda             | Secrets Manager secret holding `DATABASE_URL` (AWS)     |
| `PORT`                   | API                | HTTP port (default `3000`)                              |
| `AWS_REGION`             | API                | Region of the appointments function                     |
| `LAMBDA_FUNCTION_NAME`   | API                | Name of the appointments function                       |
| `LAMBDA_ENDPOINT`        | API                | Local runtime endpoint; unset on AWS                    |
| `LOCAL_LAMBDA_PORT`      | Local runtime      | Port of the local Lambda runtime (default `3001`)       |
| `SLOT_DURATION_MINUTES`  | Lambda             | Duration of an appointment slot (default `60`)          |
| `DB_POOL_SIZE`           | Lambda             | Connections per warm container (default `10`)           |

## API

Base path: `/api/v1`.

| Method   | Path                   | Description                                        |
| -------- | ---------------------- | -------------------------------------------------- |
| `GET`    | `/appointments?date=`  | Lists the appointments of a given date               |
| `POST`   | `/appointments`        | Creates an appointment                               |
| `PATCH`  | `/appointments/{id}`   | Reschedules an appointment (`date` and/or `time`)    |
| `DELETE` | `/appointments/{id}`   | Cancels an appointment                               |

```bash
curl -X POST http://localhost:3000/api/v1/appointments \
  -H 'Content-Type: application/json' \
  -d '{
        "clientId": "11111111-1111-4111-8111-111111111111",
        "vehicleId": "22222222-2222-4222-8222-222222222222",
        "date": "2026-01-15",
        "time": "10:00",
        "comments": "Front brake pads"
      }'
```

### Errors

Every error is a [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457) problem
document served as `application/problem+json`:

```json
{
  "type": "https://api.alten.com/problems/slot-not-available",
  "title": "The requested slot is not available",
  "status": 409,
  "detail": "Another appointment already occupies the 2026-01-15T10:00 slot.",
  "instance": "/api/v1/appointments",
  "code": "SLOT_NOT_AVAILABLE"
}
```

| Status | Code                                                    |
| ------ | ------------------------------------------------------- |
| 400    | `INVALID_REQUEST`, `INVALID_UPSTREAM_RESPONSE`          |
| 404    | `APPOINTMENT_NOT_FOUND`                                 |
| 409    | `SLOT_NOT_AVAILABLE`, `APPOINTMENT_ALREADY_CANCELLED`   |
| 500    | `INTERNAL_ERROR`                                        |
| 502    | `LAMBDA_INVOCATION_FAILED`                              |

### Double booking

PostgreSQL enforces the rule with an exclusion constraint:

```sql
EXCLUDE USING gist (
  tstzrange(starts_at, ends_at, '[)') WITH &&
) WHERE (status = 'HABILITADA')
```

The partial predicate means that cancelling an appointment frees its slot
immediately. The repository translates the `23P01` violation into a
`SlotNotAvailableError`, so a race between two concurrent bookings always ends
in a `409` instead of a `500`.

## Tests

```bash
pnpm lint           # lint + architecture boundaries
pnpm build          # type check and compile
pnpm test:coverage  # unit tests with coverage
pnpm test:bdd       # domain + acceptance tests (Cucumber)
```

| Suite             | Scope                                                        |
| ----------------- | ------------------------------------------------------------ |
| Unit tests        | Domain rules, use cases, schemas, HTTP layer (81 tests, 100% coverage) |
| Domain BDD        | Cucumber features for the slot availability rules            |
| Acceptance BDD    | End-to-end features against a real PostgreSQL (testcontainers)|

The acceptance suite boots PostgreSQL with testcontainers, so no local
database is required to run it.

## Deployment

The infrastructure is defined with [Serverless Framework](https://www.serverless.com/)
in `serverless.yml` and deployed with GitHub Actions (`.github/workflows/cd.yml`)
using OIDC, so no long-lived AWS keys live in the repository.

### AWS resources

| Resource                    | Purpose                                                    |
| --------------------------- | ---------------------------------------------------------- |
| API Gateway HTTP API        | Public entry point                                          |
| Lambda `api`                | REST API (NestJS, bundled with rspack)                     |
| Lambda `appointments`       | Business logic (bundled with esbuild)                      |
| Lambda `migrate`            | Applies the migrations, invoked by the pipeline             |
| Lambda `seed`               | Loads the demonstration data, invoked manually              |
| Secrets Manager secret      | Holds the PostgreSQL connection string                      |
| IAM role                    | Allows `lambda:InvokeFunction` and `secretsmanager:GetSecretValue` |

Both Lambdas are deployed from a single CloudFormation stack, so the API
resolves the worker name without cross-stack references.

### One-time setup

1. Configure local credentials (only needed for the one-time setup and for
   troubleshooting):

   ```bash
   aws configure
   ```

2. Create the GitHub OIDC provider and the deployment role:

   ```bash
   GITHUB_OWNER="<owner>" GITHUB_REPO="<repo>" ./scripts/bootstrap-aws.sh
   ```

   The script is idempotent: it creates the provider when it is missing,
   updates the trust policy of the role and prints the ARN to use. The trust
   policy only accepts the GitHub environments of this repository:

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Principal": { "Federated": "arn:aws:iam::<account-id>:oidc-provider/token.actions.githubusercontent.com/<owner>/<repo>" },
         "Action": "sts:AssumeRoleWithWebIdentity",
         "Condition": {
           "StringEquals": {
             "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
             "token.actions.githubusercontent.com:sub": "repo:<owner>/<repo>:environment:<stage>"
           }
         }
       }
     ]
   }
   ```

3. Store the role ARN as the `AWS_DEPLOY_ROLE_ARN` secret of the repository
   (or of each GitHub environment, see the pipelines section) and set the
   `AWS_REGION` repository variable.

4. Create the database secret:

   ```bash
   DATABASE_URL="postgres://user:password@host:5432/appointments" \
     ./scripts/create-database-secret.sh
   ```

5. Push to `dev`: the CD workflow deploys the stack, applies the migrations
   and prints the API endpoint:

   ```bash
   aws cloudformation describe-stacks \
     --stack-name appointments-dev \
     --query "Stacks[0].Outputs[?OutputKey=='ServiceEndpoint'].OutputValue" \
     --output text
   ```

   The endpoint is the AWS one (`https://<id>.execute-api.<region>.amazonaws.com`);
   no custom domain is required.

### Pipelines

| Branch    | Stage   | Trigger                                     |
| --------- | ------- | ------------------------------------------- |
| `dev`     | `dev`   | push / pull request                         |
| `qa`      | `qa`    | push / pull request                         |
| `master`  | `prod`  | push                                        |

The CD workflow reuses the CI pipeline as a gate: the `verify` job runs the
lint, the build, the unit tests and the acceptance tests, and the `deploy` job
only starts when that job has succeeded (`needs: verify`). Once the code is
verified, the workflow builds the bundles, deploys the stack, invokes the
`migrate` function and finally runs a smoke test against the public endpoint.

The workflow assumes the deployment role through GitHub OIDC, without any
long-lived key:

- If the repository can create **GitHub environments**, the workflow declares
  `environment: <stage>` and the role is only assumed from a job running
  inside that environment (the strictest option).
- Otherwise the workflow runs without an environment and the role is assumed
  with the `ref:refs/heads/<branch>` subject. The trust policy of the role
  accepts both, so the workflow works in either case.

The `AWS_DEPLOY_ROLE_ARN` secret can live at the repository level (it is read
from any workflow of the repository) or in each environment.

To deploy manually (with the local AWS credentials):

```bash
pnpm bundle:lambda && pnpm build:api-lambda
npx serverless deploy --stage dev --region us-east-1
npx serverless invoke --function migrate --stage dev --data '{}'
npx serverless invoke --function seed --stage dev --data '{}'
```

The migration is idempotent: it only applies the pending ones.

### Packaging

Both functions are shipped as a single file each:

- The **API** is bundled with rspack (`rspack.lambda.config.js`). The SWC
  loader keeps `decoratorMetadata` enabled, which is what makes Nest's
  constructor injection work.
- The **appointments service** is bundled with esbuild
  (`pnpm bundle:lambda`), because it does not rely on decorator metadata.

The resulting deployment package is ~4 MB, well below the AWS limits.

## Database

Two options are supported, with no code change beyond the secret and the
networking configuration:

| Option   | Cost                             | Notes                                                                 |
| -------- | -------------------------------- | --------------------------------------------------------------------- |
| Coolify  | ~0 USD (existing VPS)            | Public PostgreSQL: the Lambda needs a TLS connection and a strong password |
| RDS      | ~13 USD/month (db.t3.micro)      | Private in a VPC: requires a NAT gateway or a VPC endpoint for the outbound traffic |

Both functions read the connection string from Secrets Manager, so the same
artifacts work in both cases.

## Observability

- AWS X-Ray tracing is enabled for every function.
- Logs are kept for 14 days in CloudWatch.
- The API never leaks internal error details: an upstream failure is logged
  with the original message and answered with a generic problem document.
