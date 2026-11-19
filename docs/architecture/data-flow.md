# Data flow

How a request travels from the client to PostgreSQL and back, and what
happens in each layer.

## 1. List the appointments of a date

```mermaid
sequenceDiagram
    autonumber
    participant C as Client
    participant G as API Gateway HTTP
    participant A as Lambda api
    participant S as Lambda appointments
    participant P as PostgreSQL

    C->>G: GET /api/v1/appointments?date=2026-01-15
    G->>A: { rawQueryString: "date=2026-01-15" }
    A->>A: Zod validates the query (iso date)
    A->>S: Invoke { type: "appointments.list", payload: { date } }
    S->>S: Use case ListAppointmentsByDate
    S->>P: SELECT … WHERE appointment_date = $1
    P-->>S: rows
    S->>S: Map the rows to the domain model
    S-->>A: { ok: true, data: { items: [...] } }
    A->>A: Validate the answer with the response schema
    A-->>G: 200 { items: [...] }
    G-->>C: 200 OK
```

## 2. Create an appointment (double booking check)

```mermaid
sequenceDiagram
    autonumber
    participant C as Client
    participant A as Lambda api
    participant S as Lambda appointments
    participant P as PostgreSQL

    C->>A: POST /api/v1/appointments
    A->>A: Zod validates clientId, vehicleId, date, time, comments
    A->>S: Invoke { type: "appointments.create", payload }
    S->>S: Build the time slot (date + time + duration)
    S->>P: SELECT … WHERE tstzrange(starts_at, ends_at) && $slot
    P-->>S: 0 rows
    S->>P: INSERT INTO appointments …
    alt The slot was taken between the check and the insert
        P-->>S: SQLSTATE 23P01 (exclusion violation)
        S->>S: Translate it into SlotNotAvailableError
        S-->>A: { ok: false, error: { code: "SLOT_NOT_AVAILABLE" } }
        A-->>C: 409 problem+json
    else The slot was free
        P-->>S: row inserted
        S-->>A: { ok: true, data: Appointment }
        A-->>C: 201 Created
    end
```

The pre-check is only an optimisation for a friendly error message. The
**real** guarantee is the exclusion constraint in PostgreSQL: two concurrent
bookings can never end up in the same slot, whichever order the transactions
reach the database.

```mermaid
flowchart TB
    start(["POST /appointments"]) --> validate{"Payload valid?"}
    validate -->|"no"| bad["400 INVALID_PAYLOAD"]
    validate -->|"yes"| check{"Slot free?"}
    check -->|"no"| conflict["409 SLOT_NOT_AVAILABLE"]
    check -->|"yes"| insert["INSERT"]
    insert --> violated{"23P01 violation?"}
    violated -->|"yes"| conflict
    violated -->|"no"| created["201 Created"]

    style bad fill:#ffd7d7,stroke:#c00,color:#000
    style conflict fill:#ffe9c2,stroke:#d58512,color:#000
    style created fill:#d7f5dd,stroke:#2b7,color:#000
```

## 3. Reschedule an appointment

```mermaid
sequenceDiagram
    autonumber
    participant C as Client
    participant A as Lambda api
    participant S as Lambda appointments
    participant P as PostgreSQL

    C->>A: PATCH /api/v1/appointments/{id} { date?, time? }
    A->>A: Zod validates the uuid and the body
    A->>S: Invoke { type: "appointments.reschedule", payload }
    S->>P: SELECT … WHERE id = $1
    alt The appointment does not exist
        P-->>S: 0 rows
        S-->>A: { ok: false, error: { code: "APPOINTMENT_NOT_FOUND" } }
        A-->>C: 404 problem+json
    else It is already cancelled
        P-->>S: status = DESHABILITADA
        S-->>A: { ok: false, error: { code: "APPOINTMENT_ALREADY_CANCELLED" } }
        A-->>C: 409 problem+json
    else It is enabled
        P-->>S: row
        S->>S: Appointment.reschedule(slot, updatedAt)
        S->>P: SELECT overlapping (excluding itself)
        S->>P: UPDATE appointments SET …
        S-->>A: { ok: true, data: Appointment }
        A-->>C: 200 OK
    end
```

## 4. Cancel an appointment

```mermaid
sequenceDiagram
    autonumber
    participant C as Client
    participant A as Lambda api
    participant S as Lambda appointments
    participant P as PostgreSQL

    C->>A: DELETE /api/v1/appointments/{id}
    A->>A: Zod validates the uuid
    A->>S: Invoke { type: "appointments.cancel", payload }
    S->>P: SELECT … WHERE id = $1
    S->>S: Appointment.cancel(updatedAt) → DESHABILITADA
    S->>P: UPDATE appointments SET status, updated_at
    S-->>A: { ok: true, data: Appointment }
    A-->>C: 200 OK
```

Cancelling does **not** delete the row: the statement requires the status to
change to `DESHABILITADA` and the update date to be refreshed. Because the
exclusion constraint is *partial* (`WHERE status = 'HABILITADA'`), the slot is
released immediately and can be booked again.

```mermaid
stateDiagram-v2
    [*] --> HABILITADA: created
    HABILITADA --> HABILITADA: rescheduled (slot checked again)
    HABILITADA --> DESHABILITADA: cancelled
    DESHABILITADA --> DESHABILITADA: already cancelled → 409
    DESHABILITADA --> [*]
```

## 5. Error propagation

An error in the business layer is translated twice: first into the internal
`CommandResult` error, then into the public RFC 9457 document.

```mermaid
flowchart LR
    domain["DomainError<br/><i>SlotNotAvailableError</i>"] --> internal["CommandResult<br/>{ ok: false, error }"]
    internal --> api["ApiProblem<br/><i>code + detail</i>"]
    api --> problem["RFC 9457 document<br/>application/problem+json"]

    style domain fill:#fff4e6,stroke:#ff9900,color:#000
    style internal fill:#e8f4fd,stroke:#2e73b8,color:#000
    style api fill:#e8f4fd,stroke:#2e73b8,color:#000
    style problem fill:#d7f5dd,stroke:#2b7,color:#000
```

An unexpected failure never leaks internals: the service logs the original
error and answers `INTERNAL_ERROR`, and the API replaces the upstream detail
with a generic message before rendering it.

```mermaid
flowchart TB
    err["Unexpected error in the service"] --> log["logged with the original message"]
    err --> generic["{ ok: false, error: { code: 'INTERNAL_ERROR' } }"]
    generic --> generic2["API logs it and answers a generic 500"]
    generic2 -.->|"no connection strings, no SQL, no stack traces"| client["Client"]

    style err fill:#ffd7d7,stroke:#c00,color:#000
    style generic2 fill:#ffe9c2,stroke:#d58512,color:#000
    style client fill:#d7f5dd,stroke:#2b7,color:#000
```

## 6. Local development flow

The same flow, but the second Lambda runs in the local runtime instead of AWS.

```mermaid
sequenceDiagram
    autonumber
    participant C as Client (curl)
    participant A as NestJS (localhost:3000)
    participant R as Local Lambda runtime (localhost:3001)
    participant P as PostgreSQL (Docker)

    C->>A: GET /api/v1/appointments?date=…
    A->>A: Zod validates
    A->>R: InvokeCommand (LAMBDA_ENDPOINT=http://localhost:3001)
    R->>R: Command handler
    R->>P: SQL
    P-->>R: rows
    R-->>A: { ok: true, data }
    A-->>C: 200 OK
```

`LAMBDA_ENDPOINT` points the AWS SDK at the local runtime, so the production
code path (including the AWS SDK) is exercised without deploying anything.
