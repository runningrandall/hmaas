# Project Structure

This monorepo uses `pnpm` workspaces for efficient dependency management.

```
.
├── backend/                 # AWS Lambda Application
│   ├── src/
│   │   ├── adapters/        # DynamoDB Repositories & EventBridge Publisher
│   │   ├── application/     # Business Logic Services
│   │   ├── auth/            # Lambda Authorizer
│   │   ├── clients/         # DynamoDB Client Config
│   │   ├── domain/          # Interfaces, Types, Ports
│   │   ├── entities/        # ElectroDB Schemas (Single Table Design)
│   │   ├── handlers/        # Lambda Entry Points (grouped by entity)
│   │   └── lib/             # Middleware, Error Handling, Observability, Zod Schemas
│   └── test/                # Unit Tests (Vitest)
│
├── frontend/                # Next.js 16 Application
│   ├── app/                 # App Router Pages
│   ├── components/          # React Components
│   └── lib/                 # Frontend Utilities & API Client
│
├── infra/                   # AWS CDK Infrastructure
│   ├── bin/
│   │   └── infra.ts         # CDK App Entry Point
│   └── lib/
│       ├── auth-stack.ts    # Cognito + Verified Permissions
│       ├── frontend-stack.ts # S3 + CloudFront (per-stage)
│       ├── infra-stack.ts   # API GW, DynamoDB, EventBridge, CloudWatch
│       └── lambda-stack.ts  # Reusable NestedStack for Lambda groups
│
├── docs/                    # Documentation & Diagrams
├── scripts/                 # Utility Scripts (Local DB, Seeding)
├── templates/               # Plop Code Generator Templates
├── .github/workflows/       # CI/CD Definitions
└── package.json             # Root pnpm Workspace Config
```

## Key Technologies

### Backend
- **Node.js 22** (ARM_64)
- **TypeScript**
- **Middy**: Middleware engine (cors, parsing, error handling).
- **ElectroDB**: DynamoDB modeling library.
- **Zod**: Runtime validation.
- **AWS Powertools**: Logger, Tracer, Metrics.

### Frontend
- **Next.js 16** (App Router, Static Export).
- **Tailwind CSS v4**.
- **shadcn/ui**: Component library.
- **AWS Amplify**: Client SDK for Auth/API.

### Infrastructure
- **AWS CDK**: Infrastructure as Code (3 stacks + 6 nested Lambda stacks).
- **cdk-nag**: Security compliance checks.
