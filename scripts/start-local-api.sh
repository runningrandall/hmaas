#!/bin/bash

# Synth the template (needed for SAM)
pnpm --filter infra run synth

# Start API Gateway locally
# connecting to local DDB via host networking or special DNS
# For Docker on Mac/Windows, host.docker.internal resolves to host machine

export TABLE_NAME="serverless-template-table"
export LOCAL_DYNAMODB_ENDPOINT="http://host.docker.internal:8000"
export AWS_REGION="us-east-1"

sam local start-api \
    -t infra/cdk.out/InfraStack.template.json \
    --warm-containers EAGER \
    --env-vars env.json \
    --docker-network host 
    # Network host might need adjustment depending on OS/Docker setup, 
    # often accessing host.docker.internal works better for Mac

# Create dummy env.json if needed
echo "{}" > env.json
