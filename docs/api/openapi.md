# OpenAPI and the interactive documentation

The API publishes its own contract, generated from the same Zod schemas that
validate the runtime traffic.

| Resource | URL |
| --- | --- |
| **Interactive documentation (Scalar)** | <https://5sg14jfok6.execute-api.us-east-1.amazonaws.com/api/docs> |
| **OpenAPI document (JSON)** | <https://5sg14jfok6.execute-api.us-east-1.amazonaws.com/api/openapi.json> |

```mermaid
flowchart LR
    schemas["📄 Zod schemas<br/><i>src/contracts/**</i>"] --> swagger["@nestjs/swagger<br/><i>createDocument</i>"]
    swagger --> json["📋 /api/openapi.json"]
    json --> scalar["📖 /api/docs<br/><i>Scalar</i>"]
    schemas --> runtime["🛡️ runtime validation<br/><i>StandardSchemaValidationPipe</i>"]

    style schemas fill:#e8f4fd,stroke:#2e73b8,color:#000
    style scalar fill:#d7f5dd,stroke:#2b7,color:#000
```

## Why Scalar

```mermaid
flowchart TB
    swagger["Swagger UI"] -->|"classic, heavy bundle,<br/>designed for OpenAPI 2 and 3.0"| s1["✅ works everywhere"]
    scalar["Scalar"] -->|"modern, OpenAPI 3.1 native,<br/>lighter and faster"| s2["✅ chosen"]
    redoc["ReDoc"] -.->|"read only, no 'try it'"| s3["❌ cannot execute the requests"]

    style scalar fill:#d7f5dd,stroke:#2b7,color:#000
    style swagger fill:#ffe9c2,stroke:#d58512,color:#000
    style redoc fill:#ffd7d7,stroke:#c00,color:#000
```

- It is **OpenAPI 3.1** native, which is the version the document declares.
- The "Test request" button calls the **live** endpoint: the documentation is
  also a manual test console.
- It is lighter than the classic Swagger UI, which matters in a Lambda where
  every kilobyte is loaded on the cold start.
- `@scalar/nestjs-api-reference` mounts it with a single call and a single
  URL (`/api/docs`).

## What the document contains

| Section | Content |
| --- | --- |
| `paths` | The four endpoints, with the query, the parameters and the body |
| `responses` | The success responses **and** the error responses, declared as `application/problem+json` |
| `schemas` | The Zod schemas of the requests and the responses |
| `tags` | `appointments` |

```mermaid
flowchart LR
    ctrl["AppointmentsController"] -->|"@ApiOperation, @ApiResponse"| doc["OpenAPI document"]
    zod["Zod schemas"] -->|"zod-openapi.ts"| doc

    style ctrl fill:#fff4e6,stroke:#ff9900,color:#000
    style zod fill:#e8f4fd,stroke:#2e73b8,color:#000
```

The bridge between Zod and OpenAPI is `src/api/inbound/http/zod-openapi.ts`: it
converts a Zod schema into the JSON Schema fragment that the Swagger
decorators expect, so the document and the validation can never describe
different things.

## Errors in the document

The error responses are declared with the problem details schema, so the
documentation shows the exact body the client will receive:

```json
"409": {
  "description": "The time slot is already taken",
  "content": {
    "application/problem+json": {
      "schema": { "$ref": "#/components/schemas/ProblemDetails" }
    }
  }
}
```

## Local development

```bash
pnpm start:dev
```

- Documentation: <http://localhost:3000/api/docs>
- OpenAPI document: <http://localhost:3000/api/openapi.json>

## Related documents

- [endpoints.md](endpoints.md) — the endpoints with examples.
- [errors.md](errors.md) — the error catalogue.
- [ADR 0002](../decisions/0002-validation-with-zod.md) — why the schemas are
  the source of truth.
