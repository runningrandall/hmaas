#!/bin/bash
set -e

# Full-stack local development startup script
# Starts DynamoDB Local, seeds data, builds backend, then runs
# backend watch + Fastify API + Next.js frontend in parallel

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

check_prereq() {
  if ! command -v "$1" &> /dev/null; then
    echo -e "${RED}Error: $1 is not installed.${NC}"
    exit 1
  fi
}

echo "Checking prerequisites..."
check_prereq docker
check_prereq pnpm
check_prereq node

# Verify Docker is running
if ! docker info &> /dev/null; then
  echo -e "${RED}Error: Docker is not running. Please start Docker first.${NC}"
  exit 1
fi

# Verify .env exists
if [ ! -f .env ]; then
  echo -e "${YELLOW}Warning: .env file not found. Copying from .env.example...${NC}"
  cp .env.example .env
  echo -e "${GREEN}.env created — edit it if you need custom values.${NC}"
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

# 3. Build backend (must compile before Fastify can import handlers)
echo "Building backend..."
pnpm --filter backend run build

echo -e "${GREEN}Backend built. Starting services...${NC}"

# 4. Run backend watch + Fastify API + Next.js frontend in parallel
npx dotenv -e .env -- npx concurrently \
  --names "BUILD,API,FRONTEND" \
  --prefix-colors "yellow,blue,magenta" \
  --kill-others \
  "pnpm --filter backend run build --watch" \
  "node scripts/local-api-server.js" \
  "pnpm dev"
