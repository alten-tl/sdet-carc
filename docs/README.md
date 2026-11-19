# Documentation

Technical documentation of the Appointments API: architecture, the decisions
behind it, the API contract, the test strategy and the operations runbook.

> The live API is deployed at
> <https://5sg14jfok6.execute-api.us-east-1.amazonaws.com>
> and its interactive documentation (Scalar) at
> <https://5sg14jfok6.execute-api.us-east-1.amazonaws.com/api/docs>.

## Index

### Architecture

| Document | Content |
| --- | --- |
| [architecture/overview.md](architecture/overview.md) | System context, containers, components and the layer rules |
| [architecture/data-flow.md](architecture/data-flow.md) | End-to-end flow of every operation, from HTTP to SQL |
| [architecture/database.md](architecture/database.md) | Data model, migrations, constraints and indexing |
| [architecture/deployment.md](architecture/deployment.md) | AWS topology, packaging, CI/CD and the pipeline limitation |

### Decisions (ADRs)

Each record explains **what** was chosen and **why**, including the
alternatives that were discarded.

| # | Decision |
| --- | --- |
| [0001](decisions/0001-api-framework.md) | NestJS as the API framework (instead of Next.js or a compiled language such as Go) |
| [0002](decisions/0002-validation-with-zod.md) | Zod as the single source of truth for validation |
| [0003](decisions/0003-errors-rfc-9457.md) | RFC 9110 + RFC 9457 for the error responses |
| [0004](decisions/0004-infrastructure-as-code.md) | Serverless Framework as the infrastructure as code tool |
| [0005](decisions/0005-two-lambda-split.md) | Two Lambdas: the public API and the appointments service |
| [0006](decisions/0006-postgresql-and-exclusion-constraint.md) | PostgreSQL with an exclusion constraint for double booking |
| [0007](decisions/0007-shared-contracts.md) | One contracts package shared by both Lambdas |
| [0008](decisions/0008-bundling-strategies.md) | rspack for the API and esbuild for the service |
| [0009](decisions/0009-oidc-and-secrets-manager.md) | OIDC for the pipeline and Secrets Manager for the credentials |
| [0010](decisions/0010-database-hosting.md) | Managed PostgreSQL (Coolify now, RDS later) |

### API

| Document | Content |
| --- | --- |
| [api/endpoints.md](api/endpoints.md) | The four endpoints with request and response examples |
| [api/errors.md](api/errors.md) | Error catalogue and the problem details format |
| [api/openapi.md](api/openapi.md) | OpenAPI document and the Scalar reference |

### Quality and operations

| Document | Content |
| --- | --- |
| [testing/strategy.md](testing/strategy.md) | Test pyramid, coverage and how to run the suites |
| [operations/local-development.md](operations/local-development.md) | Running the whole stack on a laptop |
| [operations/runbook.md](operations/runbook.md) | Deploy, migrate, seed, rollback and troubleshoot |
| [operations/costs.md](operations/costs.md) | Estimated AWS cost and how to stay inside the free tier |
| [roadmap.md](roadmap.md) | Recommended next steps (conventional commits, semantic release, …) |
| [diagrams/](diagrams/) | Standalone Mermaid sources of every diagram |

## Conventions

- Every document is written in **English**, as required by the technical
  statement.
- Diagrams are [Mermaid](https://mermaid.js.org/) and render on GitHub, in
  VS Code and in most Markdown viewers.
- Decision records follow the lightweight ADR format: context, decision,
  alternatives, consequences.
