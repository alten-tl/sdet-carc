# Architecture decision records

Each record explains **the decision**, **why** it was taken and **which
alternatives were discarded**. They are immutable once accepted: a change of
mind is a new record that supersedes the previous one.

| # | Decision | Status |
| --- | --- | --- |
| [0001](0001-api-framework.md) | NestJS as the API framework (instead of Next.js or a compiled language such as Go) | Accepted |
| [0002](0002-validation-with-zod.md) | Zod as the single source of truth for validation | Accepted |
| [0003](0003-errors-rfc-9457.md) | RFC 9110 + RFC 9457 for the error responses | Accepted |
| [0004](0004-infrastructure-as-code.md) | Serverless Framework as the infrastructure as code tool | Accepted |
| [0005](0005-two-lambda-split.md) | Two Lambdas: the public API and the appointments service | Accepted |
| [0006](0006-postgresql-and-exclusion-constraint.md) | PostgreSQL with an exclusion constraint for the double booking | Accepted |
| [0007](0007-shared-contracts.md) | One contracts package shared by both Lambdas | Accepted |
| [0008](0008-bundling-strategies.md) | rspack for the API and esbuild for the service | Accepted |
| [0009](0009-oidc-and-secrets-manager.md) | OIDC for the pipeline and Secrets Manager for the credentials | Accepted |
| [0010](0010-database-hosting.md) | Managed PostgreSQL: Coolify now, RDS later | Accepted |

## Format

```text
# ADR NNNN — Title

- **Status:** proposed | accepted | superseded by ADR NNNN
- **Date:** YYYY-MM-DD

## Context
What forces the decision. The constraints, the requirements, the pressures.

## Decision
What was chosen, in one sentence, and how it is implemented.

## Why
The reasoning, with the alternatives and their trade-offs.

## Consequences
What becomes easier, what becomes harder, and when to revisit.
```

## How to add one

1. Copy the format above into `docs/decisions/NNNN-title.md`.
2. Use the next free number.
3. Add the row to the table above.
4. Commit it with the module prefix: `docs - Add ADR NNNN about <topic>`.
