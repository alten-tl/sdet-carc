### OIDC diagnostic

```json
{
  "header": {
    "alg": "RS256",
    "kid": "38826b17-6a30-5f9b-b169-8beb8202f723",
    "typ": "JWT",
    "x5t": "ykNaY4qM_ta4k2TgZOCEYLkcYlA"
  },
  "payload": {
    "actor": "hellsythe",
    "actor_id": "12664559",
    "aud": "sts.amazonaws.com",
    "base_ref": "",
    "check_run_id": "135972629949",
    "event_name": "push",
    "exp": 1795132668,
    "head_ref": "",
    "iat": 1795132368,
    "iss": "https://token.actions.githubusercontent.com",
    "job_workflow_ref": "alten-tl/sdet-carc/.github/workflows/oidc-diagnostic.yml@refs/heads/dev",
    "job_workflow_sha": "f90357b2fd9dd4845d60a789eb7b9f41130691d6",
    "jti": "8d3429b5-9f3b-4ae8-b83e-82c9bf653f5d",
    "nbf": 1795132068,
    "ref": "refs/heads/dev",
    "ref_protected": "false",
    "ref_type": "branch",
    "repository": "alten-tl/sdet-carc",
    "repository_id": "1464511822",
    "repository_owner": "alten-tl",
    "repository_owner_id": "209669758",
    "repository_visibility": "public",
    "run_attempt": "1",
    "run_id": "44641270450",
    "run_number": "4",
    "runner_environment": "github-hosted",
    "sha": "f90357b2fd9dd4845d60a789eb7b9f41130691d6",
    "sub": "repo:alten-tl@209669758/sdet-carc@1464511822:ref:refs/heads/dev",
    "workflow": "OIDC diagnostic",
    "workflow_ref": "alten-tl/sdet-carc/.github/workflows/oidc-diagnostic.yml@refs/heads/dev",
    "workflow_sha": "f90357b2fd9dd4845d60a789eb7b9f41130691d6"
  }
}
```

```
role-arn del secret: arn:aws:iam::550711951109:role/appointments-deploy
---

aws: [ERROR]: An error occurred (AccessDenied) when calling the AssumeRoleWithWebIdentity operation: Not authorized to perform sts:AssumeRoleWithWebIdentity
exit code del comando: 254
```
