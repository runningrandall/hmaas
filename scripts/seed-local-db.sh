#!/bin/bash

# Seed the local DynamoDB with data
# We use the same name as the CDK stack creates (or a consistent one)
TABLE_NAME="serverless-template-table"

echo "Seeding items..."
aws dynamodb batch-write-item \
    --request-items file://scripts/seed-data.json \
    --endpoint-url http://localhost:8000 \
    --region us-east-1

echo "Database seeded!"
