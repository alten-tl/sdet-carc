# Local development

The whole stack runs on a laptop, with the same code paths as production.

## Requirements

| Tool | Version | Why |
| --- | --- | --- |
| Node.js | 24 | The build tooling (the deployed functions run on Node.js 22) |
| pnpm | 10 | The package manager |
| Docker | any | PostgreSQL 17 and the testcontainers of the acceptance suite |

## The stack

```mermaid
flowchart LR
    client["📱 curl / browser"] --> nest["🟠 Nest API<br/>localhost:3000"]
    nest -->|"AWS SDK InvokeCommand"| runtime["🟠 Local Lambda runtime<br/>localhost:3001"]
    runtime --> pg[("🐘 PostgreSQL 17<br/>localhost:5432")]
    nest -.->|"LAMBDA_ENDPOINT"| runtime

    style nest fill:#ff9900,stroke:#232f3e,color:#fff
    style runtime fill:#ff9900,stroke:#232f3e,color:#fff
    style pg fill:#2e73b8,stroke:#232f3e,color:#fff
```

```mermaid
flowchart LR
    subgraph step1["1 · Database"]
        s1["docker compose up -d postgres"]
    end
    subgraph step2["2 · Schema"]
        s2["pnpm db:migrate"] --> s3["pnpm db:seed"]
    end
    subgraph step3["3 · Processes (two terminals)"]
        s4["pnpm local:lambda<br/><i>:3001</i>"]
        s5["pnpm start:dev<br/><i>:3000</i>"]
    end
    step1 --> step2 --> step3
    step3 --> s6["🌐 http://localhost:3000/api/docs"]

    style s6 fill:#d7f5dd,stroke:#2b7,color:#000
```

## Step by step

```bash
pnpm install
cp .env.example .env

# 1 · the database
docker compose up -d postgres

# 2 · the schema and the demonstration data
pnpm db:migrate
pnpm db:seed

# 3 · the two processes (in two terminals)
pnpm local:lambda    # emulates the Lambda Invoke API on :3001
pnpm start:dev       # the REST API on :3000
```

Then open <http://localhost:3000/api/docs> and try the requests from the
browser, or:

```bash
curl "http://localhost:3000/api/v1/appointments?date=2026-01-15"
```

## Why a local Lambda runtime

```mermaid
flowchart TB
    subgraph naive["❌ Without the runtime"]
        n1["The API would call AWS"] --> n2["Every change needs a deployment"]
    end
    subgraph runtime["✅ With the runtime"]
        r1["The API calls localhost:3001<br/><i>with the real AWS SDK</i>"] --> r2["The same code path, no deployment"]
    end

    style naive fill:#ffd7d7,stroke:#c00,color:#000
    style runtime fill:#d7f5dd,stroke:#2b7,color:#000
```

The API always talks to the Lambda through the **AWS SDK**
(`InvokeCommand`). The variable `LAMBDA_ENDPOINT` only changes the address
of that call:

| Variable | Local | AWS |
| --- | --- | --- |
| `LAMBDA_ENDPOINT` | `http://localhost:3001` | *not set* (the SDK resolves the real endpoint) |
| `LAMBDA_FUNCTION_NAME` | `appointments` | `appointments-<stage>-appointments` |

Because the same SDK call is used, the local environment exercises the real
integration: the command envelope, the serialisation and the error
translation.

The runtime also accepts the **API Gateway event** shape, so the handler can
be tested with the same payload that AWS would send.

## The scripts

| Script | What it does |
| --- | --- |
| `pnpm start:dev` | The Nest API in watch mode (`:3000`) |
| `pnpm local:lambda` | The local Lambda runtime (`:3001`) |
| `pnpm db:migrate` | Applies the pending migrations |
| `pnpm db:revert` | Undoes the last migration |
| `pnpm db:seed` | Loads the demonstration data |
| `pnpm lint` | Linter and architecture boundaries |
| `pnpm build` | Type check and compile |
| `pnpm test:coverage` | Unit tests with coverage |
| `pnpm test:bdd` | Domain and acceptance tests |
| `pnpm bundle:lambda` | Bundles the service (esbuild) |
| `pnpm build:api-lambda` | Bundles the API (rspack) |

## The environment variables

| Variable | Default | Description |
| --- | --- | --- |
| `DATABASE_URL` | `postgres://app:local_password@localhost:5432/appointments` | Connection string of the local database |
| `PORT` | `3000` | Port of the API |
| `LOCAL_LAMBDA_PORT` | `3001` | Port of the local Lambda runtime |
| `AWS_REGION` | `us-east-1` | Region of the appointments function |
| `LAMBDA_FUNCTION_NAME` | `appointments` | Name of the appointments function |
| `LAMBDA_ENDPOINT` | `http://localhost:3001` | Address of the local runtime (unset in AWS) |
| `SLOT_DURATION_MINUTES` | `60` | Duration of an appointment slot |
| `TEST_DATABASE_URL` | *unset* | Use an existing database instead of testcontainers |

## Running the tests

```bash
pnpm test:coverage        # unit tests (1.6 s)
pnpm test:bdd             # domain + acceptance (3.4 s, needs Docker)
pnpm test:bdd:domain      # only the domain rules (no Docker)
```

The acceptance suite starts its own PostgreSQL with testcontainers, so it
does not need the local database and it never touches the development data.

## Troubleshooting

| Symptom | Cause | Solution |
| --- | --- | --- |
| `EADDRINUSE: port 3000` | A previous `start:dev` is still running | `pkill -f "[s]tart:dev"` |
| The API answers `502 LAMBDA_INVOCATION_FAILED` | The local runtime is not up | Run `pnpm local:lambda` |
| The acceptance tests time out | The container images are not downloaded | `docker pull postgres:17-alpine && docker pull testcontainers/ryuk:0.14.0` |
| `relation "appointments" does not exist` | The migrations were not applied | `pnpm db:migrate` |
| The seed fails with a unique violation | The data is already there | `pnpm db:seed` is idempotent: it upserts |
