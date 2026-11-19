#!/usr/bin/env bash
#
# Creates or updates the AWS Secrets Manager secret that holds the PostgreSQL
# connection string used by the Lambda functions.
#
# Usage:
#   ./scripts/create-database-secret.sh
#
# The script asks for the password without echoing it, so it never reaches the
# shell history nor the screen. The connection details can be overridden with
# environment variables:
#
#   POSTGRES_HOST, POSTGRES_PORT, POSTGRES_USER, POSTGRES_DATABASE
#
# A full connection string can also be provided directly:
#
#   DATABASE_URL="postgres://user:password@host:5432/appointments" \
#     ./scripts/create-database-secret.sh
#
set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"
SECRET_NAME="${DATABASE_SECRET_NAME:-appointments/database-url}"

POSTGRES_HOST="${POSTGRES_HOST:-coolify.sdkdomains.com}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DATABASE="${POSTGRES_DATABASE:-appointments}"

if ! command -v aws > /dev/null 2>&1; then
  echo "The AWS CLI is required." >&2
  exit 1
fi

if [ -z "${DATABASE_URL:-}" ]; then
  printf "PostgreSQL password for %s@%s: " "$POSTGRES_USER" "$POSTGRES_HOST" >&2
  read -r -s POSTGRES_PASSWORD
  printf '\n' >&2

  if [ -z "$POSTGRES_PASSWORD" ]; then
    echo "The password cannot be empty." >&2
    exit 1
  fi

  export DATABASE_URL="postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DATABASE}"
  unset POSTGRES_PASSWORD
fi

PAYLOAD=$(python3 -c 'import json,os; print(json.dumps({"DATABASE_URL": os.environ["DATABASE_URL"]}))')

if aws secretsmanager describe-secret \
  --secret-id "$SECRET_NAME" \
  --region "$REGION" > /dev/null 2>&1; then
  aws secretsmanager put-secret-value \
    --secret-id "$SECRET_NAME" \
    --secret-string "$PAYLOAD" \
    --region "$REGION" > /dev/null
  echo "Secret $SECRET_NAME updated in $REGION."
else
  aws secretsmanager create-secret \
    --name "$SECRET_NAME" \
    --secret-string "$PAYLOAD" \
    --region "$REGION" > /dev/null
  echo "Secret $SECRET_NAME created in $REGION."
fi
