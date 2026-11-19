#!/usr/bin/env bash
#
# One-time AWS setup for the deployment pipeline:
#
#   1. Creates the GitHub OIDC provider (if it does not exist).
#   2. Creates (or updates) the deployment role and its trust policy.
#   3. Attaches the permissions the Serverless Framework needs.
#   4. Prints the role ARN to store as the AWS_DEPLOY_ROLE_ARN secret.
#
# Usage:
#   GITHUB_OWNER="tu-usuario" GITHUB_REPO="alten" ./scripts/bootstrap-aws.sh
#
# Environment variables:
#   AWS_REGION         region of the resources (default: us-east-1)
#   DEPLOY_ROLE_NAME   name of the role (default: appointments-deploy)
#   DEPLOY_STAGES      GitHub environments allowed to assume the role
#   DEPLOY_BRANCHES    branches allowed to assume the role when the repository
#                      cannot create GitHub environments
#
set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"
ROLE_NAME="${DEPLOY_ROLE_NAME:-appointments-deploy}"
STAGES="${DEPLOY_STAGES:-dev qa prod}"
DEPLOY_BRANCHES="${DEPLOY_BRANCHES:-dev qa master}"
OIDC_URL="https://token.actions.githubusercontent.com"

# The provider can be created for the whole GitHub issuer or restricted to a
# repository path. The host wide one is the default because AWS retrieves and
# rotates its thumbprint by itself: a provider created with an explicit
# thumbprint stops validating the tokens when the issuer renews its
# certificate.
PROVIDER_SCOPE="${OIDC_PROVIDER_SCOPE:-host}"

if [ -z "${GITHUB_OWNER:-}" ] || [ -z "${GITHUB_REPO:-}" ]; then
  echo "GITHUB_OWNER and GITHUB_REPO are required." >&2
  exit 1
fi

if ! command -v aws > /dev/null 2>&1; then
  echo "The AWS CLI is required." >&2
  exit 1
fi

if ! aws sts get-caller-identity > /dev/null 2>&1; then
  echo "No AWS credentials found. Run 'aws configure' first." >&2
  exit 1
fi

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

if [ "$PROVIDER_SCOPE" = "host" ]; then
  PROVIDER_URL="$OIDC_URL"
else
  PROVIDER_URL="${OIDC_URL}/${GITHUB_OWNER}/${GITHUB_REPO}"
fi

# 1. OIDC provider -------------------------------------------------------
if [ "$PROVIDER_SCOPE" = "host" ]; then
  PROVIDER_ARN=$(aws iam list-open-id-connect-providers \
    --query "OpenIDConnectProviderList[?ends_with(Arn, 'token.actions.githubusercontent.com')].Arn | [0]" \
    --output text)
else
  PROVIDER_ARN=$(aws iam list-open-id-connect-providers \
    --query "OpenIDConnectProviderList[?ends_with(Arn, '${GITHUB_OWNER}/${GITHUB_REPO}')].Arn | [0]" \
    --output text)
fi

if [ -z "$PROVIDER_ARN" ] || [ "$PROVIDER_ARN" = "None" ]; then
  if [ "$PROVIDER_SCOPE" = "host" ]; then
    echo "Creating the OIDC provider $PROVIDER_URL ..."
    PROVIDER_ARN=$(aws iam create-open-id-connect-provider \
      --url "$PROVIDER_URL" \
      --client-id-list sts.amazonaws.com \
      --query OpenIDConnectProviderArn \
      --output text)
  else
    # A repository scoped provider cannot be validated by AWS, so the
    # thumbprint of the issuer certificate has to be provided. It is read from
    # the live certificate to avoid a stale value after a rotation.
    echo "Creating the OIDC provider $PROVIDER_URL ..."
    THUMBPRINT=$(echo | openssl s_client -connect token.actions.githubusercontent.com:443 \
      -servername token.actions.githubusercontent.com 2> /dev/null \
      | openssl x509 -noout -fingerprint -sha1 | sed 's/.*=//; s/://g')
    PROVIDER_ARN=$(aws iam create-open-id-connect-provider \
      --url "$PROVIDER_URL" \
      --client-id-list sts.amazonaws.com \
      --thumbprint-list "$THUMBPRINT" \
      --query OpenIDConnectProviderArn \
      --output text)
  fi
else
  echo "OIDC provider already exists: $PROVIDER_ARN"
fi

# AWS requires the condition key to match the scope of the provider: a provider
# created with a repository path needs "<provider-url>:sub", while a host wide
# provider uses "token.actions.githubusercontent.com:sub".
PROVIDER_URL_SCOPE=$(aws iam get-open-id-connect-provider \
  --open-id-connect-provider-arn "$PROVIDER_ARN" \
  --query Url \
  --output text)

if [ "$PROVIDER_URL_SCOPE" = "token.actions.githubusercontent.com" ]; then
  SUBJECT_KEY="token.actions.githubusercontent.com:sub"
else
  SUBJECT_KEY="${PROVIDER_URL_SCOPE}:sub"
fi

# 2. Trust policy --------------------------------------------------------
# The JSON is built with Python to avoid escaping problems in the shell.
TRUST_POLICY=$(python3 - \
  "$PROVIDER_ARN" "$SUBJECT_KEY" "$GITHUB_OWNER" "$GITHUB_REPO" "$STAGES" "$DEPLOY_BRANCHES" <<'PYTHON'
import json
import sys

provider_arn, subject_key, owner, repository, stages, branches = sys.argv[1:7]

# GitHub environments are the strictest option: only a job running inside a
# protected environment of this repository can assume the role. The branches are
# the fallback for repositories that cannot create environments.
subjects = [
    f'repo:{owner}/{repository}:environment:{stage}' for stage in stages.split()
]
subjects += [
    f'repo:{owner}/{repository}:ref:refs/heads/{branch}' for branch in branches.split()
]

# A single statement keeps the document under the 2048 bytes quota of the
# ACL size of a role.
policy = {
    'Version': '2012-10-17',
    'Statement': [
        {
            'Effect': 'Allow',
            'Principal': {'Federated': provider_arn},
            'Action': 'sts:AssumeRoleWithWebIdentity',
            'Condition': {
                'StringEquals': {
                    'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com'
                },
                'StringLike': {subject_key: subjects},
            },
        }
    ],
}

print(json.dumps(policy, indent=2))
PYTHON
)

# 3. Permissions ---------------------------------------------------------
PERMISSIONS_POLICY=$(cat <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["cloudformation:*", "lambda:*", "apigateway:*", "s3:*", "logs:*"],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "iam:CreateRole", "iam:DeleteRole", "iam:GetRole", "iam:ListRolePolicies",
        "iam:PutRolePolicy", "iam:DeleteRolePolicy", "iam:GetRolePolicy",
        "iam:AttachRolePolicy", "iam:DetachRolePolicy", "iam:TagRole",
        "iam:UntagRole", "iam:UpdateAssumeRolePolicy", "iam:PassRole",
        "iam:CreateServiceLinkedRole"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": ["xray:PutTraceSegments", "xray:PutTelemetryRecords"],
      "Resource": "*"
    }
  ]
}
EOF
)

ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/${ROLE_NAME}"

if aws iam get-role --role-name "$ROLE_NAME" > /dev/null 2>&1; then
  echo "Updating the role $ROLE_NAME ..."
  aws iam update-assume-role-policy --role-name "$ROLE_NAME" --policy-document "$TRUST_POLICY"
  aws iam put-role-policy --role-name "$ROLE_NAME" --policy-name deploy --policy-document "$PERMISSIONS_POLICY"
else
  echo "Creating the role $ROLE_NAME ..."
  aws iam create-role \
    --role-name "$ROLE_NAME" \
    --assume-role-policy-document "$TRUST_POLICY" \
    --description "Deployment role for the appointments API (GitHub OIDC)" > /dev/null
  aws iam put-role-policy --role-name "$ROLE_NAME" --policy-name deploy --policy-document "$PERMISSIONS_POLICY"
fi

# 4. Result --------------------------------------------------------------
echo
echo "Deployment role ready: ${ROLE_ARN}"
echo
echo "Next steps:"
echo "  1. Add the secret AWS_DEPLOY_ROLE_ARN = ${ROLE_ARN}"
echo "     (repository level, or in each GitHub environment: ${STAGES})"
echo "  2. In the repository settings, add the variable AWS_REGION = ${REGION}"
echo "  3. Create the database secret:"
echo "       DATABASE_URL='postgres://...' ./scripts/create-database-secret.sh"
