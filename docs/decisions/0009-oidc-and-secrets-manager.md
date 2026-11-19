# ADR 0009 — OIDC for the pipeline and Secrets Manager for the credentials

- **Status:** accepted
- **Date:** 2026-11-19
- **Related:** [0004](0004-infrastructure-as-code.md)

## Context

The pipeline needs AWS permissions to deploy the stack. There are three ways
to give them to it:

1. A long-lived access key stored as a secret in GitHub.
2. A short-lived credential obtained by assuming a role.
3. A federated token exchanged directly for credentials (**OpenID Connect**).

The database connection string is a third kind of secret: it is needed at
runtime by the functions, not by the pipeline.

## Decision

### The pipeline: GitHub OIDC, no static keys

```mermaid
sequenceDiagram
    autonumber
    participant GH as GitHub Actions
    participant OIDC as GitHub OIDC issuer
    participant STS as AWS STS
    participant AWS as AWS (role: appointments-deploy)

    GH->>OIDC: request a token (aud=sts.amazonaws.com)
    OIDC-->>GH: signed JWT (sub=repo:alten-tl/sdet-carc:ref:refs/heads/dev)
    GH->>STS: AssumeRoleWithWebIdentity(token)
    STS->>STS: verify the signature and the trust policy
    STS-->>GH: temporary credentials (~1 hour)
    GH->>AWS: serverless deploy with the temporary credentials
```

The trust policy only accepts the `sub` values of this repository, and the
provider itself is **path scoped** to the repository:

```json
{
  "Effect": "Allow",
  "Principal": { "Federated": "arn:aws:iam::550711951109:oidc-provider/token.actions.githubusercontent.com/alten-tl/sdet-carc" },
  "Action": "sts:AssumeRoleWithWebIdentity",
  "Condition": {
    "StringEquals": { "token.actions.githubusercontent.com:aud": "sts.amazonaws.com" },
    "StringLike": {
      "token.actions.githubusercontent.com/alten-tl/sdet-carc:sub": [
        "repo:alten-tl/sdet-carc:environment:dev",
        "repo:alten-tl/sdet-carc:environment:qa",
        "repo:alten-tl/sdet-carc:environment:prod",
        "repo:alten-tl/sdet-carc:ref:refs/heads/dev",
        "repo:alten-tl/sdet-carc:ref:refs/heads/qa",
        "repo:alten-tl/sdet-carc:ref:refs/heads/master"
      ]
    }
  }
}
```

### The runtime: AWS Secrets Manager

```mermaid
flowchart LR
    svc["Lambda appointments"] -->|"GetSecretValue"| sm["🔐 Secrets Manager<br/>appointments/database-url"]
    sm --> url["{ DATABASE_URL: postgres://… }"]
    url --> svc
    git["📁 GitHub"] -.->|"❌ the connection string never<br/>enters the repository"| sm

    style sm fill:#dd344c,stroke:#232f3e,color:#fff
    style git fill:#f5f5f5,stroke:#333,color:#000
```

The secret is created by `scripts/create-database-secret.sh`, which asks for
the password **without echoing it**, so it never reaches the shell history.

### The thumbprint of the issuer: a trap worth documenting

The first deployment of the pipeline failed with:

```text
Could not assume role with OIDC: The web identity token provided could not be
validated. See the AssumeRoleWithWebIdentity documentation for requirements.
```

The cause was **not** the trust policy: the OIDC provider had been created
with an explicit thumbprint, and AWS validates the signature of the token
against the certificate of the issuer. When GitHub renewed that certificate,
the stored thumbprint became obsolete and **every** token was rejected.

```mermaid
flowchart LR
    a["Provider creado con<br/>--thumbprint-list 1b511abe…"] --> b["GitHub renueva el<br/>certificado → d367a479…"]
    b --> c["❌ La firma ya no valida<br/>→ 'the web identity token could not be validated'"]

    style a fill:#ffe9c2,stroke:#d58512,color:#000
    style c fill:#ffd7d7,stroke:#c00,color:#000
```

The fix is to create the provider **without** an explicit thumbprint:

```bash
aws iam create-open-id-connect-provider \
  --url "https://token.actions.githubusercontent.com" \
  --client-id-list sts.amazonaws.com
```

AWS then retrieves the thumbprint of the **root certificate** of the issuer
(`ab9d0263244dd0326eb67015705a667e79cfe998` at the time of writing) and
**keeps it updated**, so the renewals of the leaf certificate stop being a
problem.

| Provider | Thumbprint | Who maintains it | On a certificate renewal |
| --- | --- | --- | --- |
| Host wide (`token.actions.githubusercontent.com`) | Root CA, retrieved by AWS | AWS | ✅ Nothing to do |
| Repository scoped (`…/owner/repo`) | The leaf certificate, provided by us | Us | ⚠️ It has to be refreshed |

A repository scoped provider cannot be validated by AWS (it looks for the
`/.well-known/openid-configuration` of the scoped URL, which GitHub does not
serve), so it always needs an explicit thumbprint. That is why the deployment
uses the **host wide** provider: the trust policy still restricts the role to
the subjects of this repository, and the certificate renewals stop breaking
the pipeline.

The `bootstrap-aws.sh` script computes the thumbprint from the live
certificate when a repository scoped provider is requested, and omits it for
the host wide one.

## Why OIDC and not a stored access key

```mermaid
flowchart TB
    start["Credentials for the pipeline"] --> oidc["✅ OIDC<br/>temporary, scoped, no secret stored"]
    start --> keys["❌ Access key in GitHub<br/>long lived, visible, rotatable only by hand"]

    oidc --> o1["Nothing to leak: GitHub only stores the role ARN"]
    oidc --> o2["The credentials expire in ~1 hour"]
    oidc --> o3["The trust policy decides who can deploy"]
    keys -.-> k1["A compromised repository leaks the key"]

    style oidc fill:#d7f5dd,stroke:#2b7,color:#000
    style keys fill:#ffd7d7,stroke:#c00,color:#000
```

- **Nothing sensitive is stored in GitHub.** The only value is the ARN of the
  role, which is a public identifier.
- **The permissions are scoped by the trust policy**, not by the secret: the
  role can only be assumed from this repository.
- **The credentials are short lived** and disappear with the job.
- **Auditable**: CloudTrail records every assumption of the role.

## Why Secrets Manager and not an environment variable

- The connection string would otherwise have to be part of the
  CloudFormation template (and therefore of the repository and of the stack
  history).
- Secrets Manager is encrypted, versioned, and its access can be granted per
  function through IAM.
- Rotating the password is a `put-secret-value` call: the next invocation of
  the Lambda picks up the new value without a deployment.

## The limitation of the current setup

The repository does not allow creating **GitHub environments**, so the
workflow cannot use the strictest mode (`environment: dev`, which requires an
approval and can carry protection rules). The workflow therefore runs without
an environment and assumes the role with the branch subject
(`ref:refs/heads/dev`).

The trust policy accepts both forms, so when the environments become
available the workflow only has to add one line:

```yaml
jobs:
  deploy:
    environment: ${{ env.STAGE }}
```

and the deployment will use the `environment:<stage>` subject, which is
strictly narrower.

## Consequences

**Positive**

- The repository contains no credential that can be used to access AWS.
- The role can be rotated (or revoked) without touching the repository.
- The database password never enters the CI logs.

**Negative**

- The first setup needs a one-time bootstrap with an administrator
  (`scripts/bootstrap-aws.sh`).
- The branch based subject is slightly less restrictive than the environment
  based one: any push to `dev` can deploy to the `dev` stage.
