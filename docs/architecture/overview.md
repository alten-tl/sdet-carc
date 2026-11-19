# Architecture overview

The system is a REST API for a vehicle repair shop. It runs entirely on AWS
Serverless and stores its data in PostgreSQL.

The technical statement asked for *"a small REST API in local, that allows
consuming a Lambda to perform a CRUD against a local database"* and drew the
following reference architecture:

```mermaid
flowchart LR
    Gateway["Amazon API Gateway"] --> Crud["CRUD Lambda"]
    Crud --> Db[("Postgres / MariaDB")]

    style Gateway fill:#232f3e,stroke:#ff9900,color:#fff
    style Crud fill:#ff9900,stroke:#232f3e,color:#fff
    style Db fill:#2e73b8,stroke:#232f3e,color:#fff
```

That is exactly the shape of the solution: the API **consumes** a Lambda that
performs the CRUD. The implementation keeps that shape and makes the contract
between both explicit.

## System context

```mermaid
flowchart TB
    client["📱 Client<br/>(curl, browser, mobile app)"]
    subgraph aws["☁️ AWS — account 550711951109, us-east-1"]
        apigw["API Gateway HTTP API<br/><i>public endpoint</i>"]
        api["⚡ Lambda: api<br/><i>NestJS, 1024 MB</i>"]
        svc["⚡ Lambda: appointments<br/><i>domain + persistence, 512 MB</i>"]
        secret["🔐 Secrets Manager<br/>appointments/database-url"]
        logs["📊 CloudWatch + X-Ray"]
    end
    subgraph coolify["🖥️ Coolify VPS"]
        pg[("PostgreSQL 18<br/>db: appointments")]
    end

    client -->|"HTTPS / JSON"| apigw
    apigw -->|"HTTP event"| api
    api -->|"lambda:Invoke (RequestResponse)"| svc
    svc -->|"read the connection string"| secret
    svc -->|"SQL over TCP"| pg
    api -.-> logs
    svc -.-> logs

    style client fill:#f5f5f5,stroke:#333,color:#000
    style apigw fill:#232f3e,stroke:#ff9900,color:#fff
    style api fill:#ff9900,stroke:#232f3e,color:#fff
    style svc fill:#ff9900,stroke:#232f3e,color:#fff
    style secret fill:#dd344c,stroke:#232f3e,color:#fff
    style logs fill:#5a3d5a,stroke:#232f3e,color:#fff
    style pg fill:#2e73b8,stroke:#232f3e,color:#fff
```

## Containers

| Container | Technology | Responsibility |
| --- | --- | --- |
| **Public API** | NestJS 12, Node.js 22, Lambda | Terminates HTTP, validates the request contract, renders RFC 9457 errors, publishes the OpenAPI document. It never touches the database. |
| **Appointments service** | TypeScript, TypeORM, Lambda | Owns the domain rules, the use cases and the persistence. It never knows about HTTP. |
| **Database** | PostgreSQL 18 | Stores the appointments, the clients and the vehicles. Enforces the double booking rule. |
| **Secret store** | AWS Secrets Manager | Holds the PostgreSQL connection string. |

## Components inside the Lambda functions

```mermaid
flowchart TB
    subgraph apiLambda["Lambda: api"]
        direction TB
        ctrl["Controllers<br/><i>HTTP verbs, routes, status codes</i>"]
        pipes["StandardSchemaValidationPipe<br/><i>Zod schemas at the boundary</i>"]
        filter["ApiExceptionFilter<br/><i>RFC 9457 rendering</i>"]
        service["AppointmentsService"]
        gateway["CommandGateway<br/><i>AWS SDK InvokeCommand</i>"]
        ctrl --> pipes --> service --> gateway
        ctrl -.-> filter
    end

    subgraph svcLambda["Lambda: appointments"]
        direction TB
        handler["Command handler<br/><i>type + payload → ok / error</i>"]
        usecases["Use cases<br/><i>list · create · reschedule · cancel</i>"]
        domain["Domain<br/><i>Appointment, Client, Vehicle, slot policy</i>"]
        repo["AppointmentRepository<br/><i>TypeORM port</i>"]
        db[("PostgreSQL")]
        handler --> usecases --> domain
        usecases --> repo --> db
    end

    contracts["📦 @contracts<br/><i>commands · payloads · errors · problem details</i>"]
    gateway -.->|"CommandEnvelope"| handler
    contracts -.-> apiLambda
    contracts -.-> svcLambda

    style contracts fill:#e8f4fd,stroke:#2e73b8,color:#000
    style apiLambda fill:#fff4e6,stroke:#ff9900,color:#000
    style svcLambda fill:#fff4e6,stroke:#ff9900,color:#000
```

## The contract between both functions

The API never imports the business logic, and the service never imports
anything HTTP related. They only share the `contracts` package, which defines
the messages both sides speak:

```mermaid
sequenceDiagram
    autonumber
    participant C as Client
    participant G as API Gateway
    participant A as Lambda api
    participant S as Lambda appointments
    participant P as PostgreSQL

    C->>G: POST /api/v1/appointments
    G->>A: HTTP event (payload v2.0)
    A->>A: Validate the body with Zod
    A->>S: InvokeCommand { type: "appointments.create", payload }
    S->>P: SELECT overlapping appointments
    S->>P: INSERT appointment
    P-->>S: ok (or 23P01 exclusion violation)
    S-->>A: { ok: true, data: Appointment }
    A-->>G: 201 + JSON
    G-->>C: 201 Created
```

The messages are defined in `src/contracts`:

| Contract | Purpose |
| --- | --- |
| `command-contracts.ts` | `CommandEnvelope` (request) and `CommandResult` (response) |
| `appointments/commands.schemas.ts` | Payload of every command, validated with Zod |
| `appointments/errors.ts` | The error codes both sides understand |
| `protocol/problem.schemas.ts` | The RFC 9457 document rendered by the API |

## Layer rules (hexagonal architecture)

The dependency rule is **enforced by the linter**, not only by convention
(`pnpm lint` runs `src/tools/check-boundaries.ts`):

```mermaid
flowchart LR
    api["api/**"] -->|"allowed"| contracts["contracts/**"]
    api -->|"allowed"| lambda["lambda/**"]
    lambda -->|"allowed"| contracts
    contracts -->|"forbidden"| api
    contracts -->|"forbidden"| lambda
    lambda -->|"forbidden"| api

    style api fill:#fff4e6,stroke:#ff9900,color:#000
    style lambda fill:#fff4e6,stroke:#ff9900,color:#000
    style contracts fill:#e8f4fd,stroke:#2e73b8,color:#000
```

| From | May import |
| --- | --- |
| `src/api` | `src/contracts`, `src/lambda` |
| `src/lambda` | `src/contracts` |
| `src/contracts` | nothing (it is pure data and schemas) |

The API is allowed to import the lambda layer because it needs the domain
types to build its responses; the lambda layer must never import the API
layer, because that would couple the business rules to HTTP.

## Project layout

```text
src/
├── api/                  # HTTP layer
│   ├── application/      #   use cases and ports used by the API
│   ├── config/           #   environment configuration
│   ├── errors/           #   RFC 9457 problem details
│   ├── http/             #   OpenAPI helpers
│   ├── inbound/http/     #   controllers, pipes and filters
│   └── outbound/lambda/  #   the AWS SDK gateway
├── contracts/            # shared contracts (no dependencies)
├── lambda/               # business layer
│   ├── config/           #   secret provider
│   ├── handlers/         #   migrate and seed handlers
│   └── modules/appointments/
│       ├── application/  #     use cases, mappers, ports
│       ├── domain/       #     entities, value objects, policies
│       └── infrastructure/persistence/  # TypeORM, migrations, seed
├── tools/                # local tooling (migrate, seed, local runtime)
├── app.module.ts         # composition root of the API
└── api-lambda.ts         # entry point of the API Lambda
```

## Related documents

- [data-flow.md](data-flow.md) — the flow of every operation, step by step.
- [database.md](database.md) — the data model and its constraints.
- [deployment.md](deployment.md) — the AWS topology and the CI/CD pipeline.
- [../decisions/](../decisions/) — why each technology was chosen.
