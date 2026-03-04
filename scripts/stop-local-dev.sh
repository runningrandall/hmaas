#!/bin/bash

# Stop all local dev services

echo "Stopping local dev services..."

# Kill any running dev:local / concurrently processes
pkill -f "local-api-server.js" 2>/dev/null
pkill -f "concurrently.*BUILD,API,FRONTEND" 2>/dev/null

# Stop DynamoDB Local container
if [ "$(docker ps -q -f name=dynamo-local)" ]; then
    docker stop dynamo-local > /dev/null
    echo "DynamoDB Local stopped."
else
    echo "DynamoDB Local was not running."
fi

echo "Done."
