#!/bin/bash
set -e

# Full-stack local development startup script
# Starts DynamoDB Local, seeds data, then runs API + Frontend in parallel

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

check_prereq() {
  if ! command -v "$1" &> /dev/null; then
    echo -e "${RED}Error: $1 is not installed.${NC}"
    exit 1
  fi
}

echo "Checking prerequisites..."
check_prereq docker
check_prereq sam
check_prereq pnpm

# Verify Docker is running
if ! docker info &> /dev/null; then
  echo -e "${RED}Error: Docker is not running. Please start Docker first.${NC}"
  exit 1
fi

echo -e "${GREEN}All prerequisites met.${NC}"

# 1. Start DynamoDB Local
echo "Starting DynamoDB Local..."
bash scripts/start-local-db.sh

# Give DynamoDB a moment to be ready
sleep 2

# 2. Initialize and seed the database
echo "Initializing local database..."
node scripts/init-local-db.js

echo "Seeding local database..."
node scripts/seed-local-db.js

echo -e "${GREEN}Database ready.${NC}"

# 3. Run API + Frontend in parallel
echo "Starting API and Frontend..."
npx concurrently \
  --names "API,FRONTEND" \
  --prefix-colors "blue,magenta" \
  "pnpm api:start" \
  "pnpm dev"
