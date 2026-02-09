#!/bin/bash

# Start DynamoDB Local in Docker
docker run -d -p 8000:8000 --name dynamo-local amazon/dynamodb-local

echo "DynamoDB Local started on port 8000"
