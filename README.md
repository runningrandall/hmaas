# Serverless Full-Stack Template

A production-ready, full-stack serverless template built with modern best practices. Clone it, customize it, and ship.

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16 (App Router), Tailwind CSS, shadcn/ui |
| **Backend** | AWS Lambda (Node.js 22, TypeScript), Middy Middleware |
| **Database** | DynamoDB (Single Table Design via ElectroDB) |
| **Auth** | Amazon Cognito + Amazon Verified Permissions (Cedar) |
| **Infrastructure** | AWS CDK (TypeScript), 3 stacks |
| **CI/CD** | GitHub Actions |
| **Observability** | AWS Powertools (Logger, Tracer, Metrics), CloudWatch Dashboard |
| **Security** | WAF, cdk-nag, Lambda Authorizer |
| **Testing** | Vitest (unit), Cypress (E2E + a11y), Jest (infra), Integration tests |
| **Docs** | Storybook 10, OpenAPI (Swagger UI) |

## Project Structure

```
├── backend/                 # Lambda handlers, entities, middleware
│   ├── src/
│   │   ├── auth/            # Lambda authorizer (Cognito + Cedar)
│   │   ├── entities/        # ElectroDB entity definitions
│   │   ├── handlers/        # API Lambda handlers
│   │   └── lib/             # Shared: middleware, error, observability, schemas, OpenAPI
│   └── test/                # Vitest unit tests
├── frontend/                # Next.js application
│   ├── app/                 # Pages: home, admin, api-docs, login, profile
│   ├── components/          # React components (shadcn/ui)
│   ├── cypress/             # E2E & accessibility tests
│   ├── stories/             # Storybook stories
│   └── .storybook/          # Storybook configuration
├── infra/                   # AWS CDK infrastructure
│   ├── bin/infra.ts         # CDK app entry point (cdk-nag + tags)
│   └── lib/
│       ├── auth-stack.ts    # Cognito User Pool, Verified Permissions
│       ├── frontend-stack.ts# S3 + CloudFront (prod/non-prod)
│       └── infra-stack.ts   # API GW, Lambda, DynamoDB, EventBridge, WAF, Alarms, Dashboard
├── scripts/                 # Local dev + integration tests
├── templates/               # Plop code generators
├── .github/workflows/       # CI/CD pipeline
└── .husky/                  # Git hooks (pre-commit lint, pre-push test)
```

## Prerequisites

- **Node.js** v22+
- **pnpm** (`npm install -g pnpm`)
- **AWS CLI** configured with credentials (`aws configure`)
- **AWS CDK** (`npm install -g aws-cdk`)
- **Docker** (for DynamoDB Local)
- **AWS SAM CLI** (for local Lambda, `brew install aws-sam-cli`)

## Getting Started

```bash
# 1. Install dependencies
pnpm install

# 2. Copy environment variables
cp .env.example .env

# 3. Deploy to AWS (uses your OS username as stage name)
pnpm deploy

# 4. Configure frontend
echo "NEXT_PUBLIC_API_URL=<your-api-url-from-deploy-output>" > frontend/.env.local

# 5. Start frontend
pnpm dev
```

## Local Development

Run the full stack locally with a single command:

```bash
pnpm dev:local     # Start everything: DynamoDB, API, and Frontend
```

Or run services individually:

```bash
pnpm dev           # Start frontend (Next.js dev server)
pnpm db:start      # Start DynamoDB Local (Docker)
pnpm db:init       # Create tables
pnpm db:seed       # Seed sample data
pnpm api:start     # Start local API (SAM)
pnpm dev:backend   # Watch-mode backend + local API
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://127.0.0.1:3001 |
| DynamoDB Local | http://localhost:8000 |

---

## � Documentation

The documentation has been split into detailed guides:

- **[Project Structure](docs/project-structure.md)** — Layout and technologies.
- **[Backend Architecture](docs/backend-architecture.md)** — Lambda, DynamoDB (ElectroDB), EventBridge, and DLQs.
- **[Authentication & Authorization](docs/authentication.md)** — Cognito, Verified Permissions, and Lambda Authorizer.
- **[Testing Strategy](docs/testing.md)** — Unit, Infra, E2E, and Integration testing guides.
- **[CI/CD Pipelines](docs/cicd.md)** — GitHub Actions workflows and deployment strategy.
- **[Observability](docs/observability.md)** — Metrics, Logging, Tracing, and Dashboards.
- **[Secrets Management](docs/secrets-management.md)** — Handling credentials secure.
- **[Cost Estimation](docs/cost-estimation.md)** — Infracost integration.
- **[Code Generation](docs/code-generation.md)** — Plop generators for entities, endpoints, and components.

## Features

- **Backend**: Lambda (Node.js 22), Middy Middleware, ElectroDB (Single Table).
- **Frontend**: Next.js 16, Tailwind, shadcn/ui.
- **Infrastructure**: AWS CDK, dev and prod environments.
- **Security**: WAF, cdk-nag, fine-grained permissions.
- **Tools**: Plop generator, Husky git hooks.

[Read more in Project Structure](docs/project-structure.md).

## Available Scripts

| Script | Description |
|---|---|
| `pnpm dev` | Start Next.js dev server |
| `pnpm build` | Build all workspaces |
| `pnpm test` | Run all unit tests |
| `pnpm test:coverage` | Run all tests with coverage |
| `pnpm deploy` | Deploy infrastructure to AWS |
| `pnpm dev:local` | Start full local stack (DynamoDB + API + Frontend) |
| `pnpm generate` | Scaffold new endpoint or component |

## Deployment

CI/CD is handled via GitHub Actions with two environments:

- **Dev**: Opening a PR from `dev` to `main` triggers a deploy to the dev environment.
- **Prod**: Merging `dev` into `main` triggers semantic-release and deploys to production.

```bash
pnpm deploy  # Manual deploy (uses STAGE_NAME env var, defaults to 'dev')
```

For detailed deployment and CI/CD info, see [CI/CD Pipelines](docs/cicd.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT](LICENSE)
