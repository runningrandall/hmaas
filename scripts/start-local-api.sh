#!/bin/bash

STAGE_NAME="${STAGE_NAME:-dev}"
APP_NAME="${APP_NAME:-Versa}"
STACK_NAME="${APP_NAME}InfraStack-${STAGE_NAME}"
TEMPLATE_PATH="infra/cdk.out/${STACK_NAME}.template.json"

# Synth the template (needed for SAM)
pnpm --filter infra run synth

if [ ! -f "$TEMPLATE_PATH" ]; then
  echo "Error: Template not found at $TEMPLATE_PATH"
  echo "Available templates:"
  ls infra/cdk.out/*.template.json 2>/dev/null
  exit 1
fi

# Generate env.json from current environment variables
node -e "
  const fs = require('fs');
  const env = {
    '${STACK_NAME}': {
      'TABLE_NAME': process.env.TABLE_NAME,
      'LOCAL_DYNAMODB_ENDPOINT': process.env.LOCAL_DYNAMODB_ENDPOINT,
      'AWS_REGION': process.env.AWS_REGION
    }
  };
  fs.writeFileSync('env.json', JSON.stringify(env, null, 2));
"

sam local start-api \
    -t "$TEMPLATE_PATH" \
    --warm-containers EAGER \
    --env-vars env.json \
    --docker-network host
