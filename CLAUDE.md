# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Versa - a **multi-tenant** property management platform for home and commercial property. Multiple property management companies (organizations) operate independently on the platform. We offer all your property management needs (lawn, window cleaning, pest control, fertilizer, sprinkler, winterizing, etc.) in one single bundle that saves you money and time.

## Monorepo Structure

```
├── frontend/    # Next.js 16 (App Router) - UI
├── backend/     # AWS Lambda handlers - API (uses hexagonal architecture)
├── infra/       # AWS CDK stacks - Infrastructure including EventBridge, DynamoDB, SES, Cognito, etc.
├── docs/        # Documentation
├── scripts/     # Local dev scripts (seed, init DB)
└── plop-templates/  # Code generators
```

## Common Commands

```bash
pnpm dev                  # Start Next.js dev server
pnpm build                # Build all workspaces
pnpm test                 # Test all workspaces
pnpm lint                 # Lint all workspaces
pnpm commit               # Commitizen conventional commit
pnpm generate             # Plop code generator

# Workspace-specific
pnpm --filter frontend dev      # Frontend dev server
pnpm --filter backend run build         # Build Lambda handlers
pnpm --filter backend run test          # Backend unit tests
pnpm --filter infra run synth           # CDK synth CloudFormation
pnpm --filter infra run deploy          # CDK deploy

# Local DynamoDB
pnpm db:start             # Start DynamoDB Local (Docker)
node scripts/init-local-db.js           # Create local table
node scripts/seed-local-db.js           # Seed local data
```

## Architecture

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), Tailwind CSS v4, AWS Amplify (auth), Cloudfront, S3 |
| Backend | AWS Lambda (Node.js 22, TypeScript), Middy, ElectroDB |
| Database | DynamoDB (Single Table Design), ElectroDB for database |
| Events | EventBridge for Async Messaging (all key lifecycle events) |
| Auth | Amazon Cognito + Verified Permissions (Cedar) |
| Infrastructure | AWS CDK (TypeScript), 3 stacks |
| CI/CD | GitHub Actions (deploy, teardown, release) |
| Observability | AWS Powertools (Logger, Tracer, Metrics), Cloudwatch |
| Security | WAF, cdk-nag, Lambda Authorizer |
| Testing | Vitest (backend + frontend), Jest (infra) |
| Linting | Eslint for code fixes and linting |
| Validation | Zod for all validation |

## Backend Architecture (Hexagonal)

Each entity follows the hexagonal (ports & adapters) pattern:
```
handlers/          → Thin HTTP layer (Lambda entry points, Middy middleware)
application/       → Business logic services (orchestrate domain + ports)
domain/            → Interfaces, types, contracts (ports)
adapters/          → Implementations (DynamoDB repositories, EventBridge publisher)
entities/          → ElectroDB entity definitions (DynamoDB schema)
lib/               → Shared utilities (middleware, error handling, observability, Zod schemas)
```

## Multi-Tenancy

All data is scoped by `organizationId`. The `Organization` entity is the top-level tenant boundary.

- **organizationId** is the first composite in every entity's PK → DynamoDB partitions data by org → strong tenant isolation
- All list operations use `query` (not `scan`) with `organizationId` as the partition prefix
- GSI1 also includes `organizationId` as the first composite in pk for parent lookups within an org
- GSI2 enables cross-org queries for super admin: `gsi2pk: []` (service prefix), `gsi2sk: [organizationId, entityId]`
- Lookup entities (PropertyType, ServiceType, CostType) use `organizationId = "GLOBAL"` for platform defaults
- Auth: `organizationId` is injected into Cognito access tokens via Pre Token Generation Lambda trigger
- Middleware: `orgContextMiddleware` extracts `organizationId` from authorizer context and attaches to request; org management routes use `superAdminMiddleware` (no org scoping)
- Secrets: Org-sensitive config (Stripe keys, etc.) stored in AWS Secrets Manager at `versa/org/{organizationId}/secrets`

## Entity Model

### Organization (tenant boundary)
| Entity | Key Attributes | PK Composite | GSI1 | GSI2 |
|---|---|---|---|---|
| **Organization** | organizationId, name, slug, status, ownerUserId, billingEmail, phone, address, city, state, zip, timezone, config | `[organizationId]` | `[slug]` / `[organizationId]` | `[status]` / `[organizationId]` |

### Lookup Entities (reference data, organizationId = "GLOBAL")
| Entity | Key Attributes | PK Composite | GSI2 |
|---|---|---|---|
| **PropertyType** | propertyTypeId, name, description | `[orgId, propertyTypeId]` | `[]` / `[orgId, propertyTypeId]` |
| **ServiceType** | serviceTypeId, name, description, category | `[orgId, serviceTypeId]` | `[]` / `[orgId, serviceTypeId]` |
| **CostType** | costTypeId, name, description | `[orgId, costTypeId]` | `[]` / `[orgId, costTypeId]` |

### Core Entities
| Entity | Key Attributes | PK Composite | GSI1 PK/SK | GSI2 SK |
|---|---|---|---|---|
| **Customer** | customerId, firstName, lastName, email, phone, status, notes | `[orgId, customerId]` | `[orgId, status]` / `[customerId]` | `[orgId, customerId]` |
| **Account** | accountId, customerId, cognitoUserId, planId, status, billingEmail | `[orgId, accountId]` | `[orgId, customerId]` / `[accountId]` | `[orgId, accountId]` |
| **Delegate** | delegateId, accountId, email, name, permissions[], status | `[orgId, delegateId]` | `[orgId, accountId]` / `[delegateId]` | `[orgId, delegateId]` |
| **Property** | propertyId, customerId, propertyTypeId, name, address, city, state, zip, lat, lng, lotSize, notes, status | `[orgId, propertyId]` | `[orgId, customerId]` / `[propertyId]` | `[orgId, propertyId]` |

### Plan & Service Entities
| Entity | Key Attributes | PK Composite | GSI1 PK/SK | GSI2 SK |
|---|---|---|---|---|
| **Plan** | planId, name, description, monthlyPrice, annualPrice, status | `[orgId, planId]` | `[orgId]` / `[planId]` | `[orgId, planId]` |
| **PlanService** | planId, serviceTypeId, includedVisits, frequency | `[orgId, planId]` / SK: `[serviceTypeId]` | — | `[orgId, planId]` |
| **PropertyService** | serviceId, propertyId, serviceTypeId, planId, status, startDate, endDate, frequency | `[orgId, serviceId]` | `[orgId, propertyId]` / `[serviceId]` | `[orgId, serviceId]` |
| **Cost** | costId, serviceId, costTypeId, amount, description, effectiveDate | `[orgId, costId]` | `[orgId, serviceId]` / `[costId]` | `[orgId, costId]` |

### Employee & Scheduling Entities
| Entity | Key Attributes | PK Composite | GSI1 PK/SK | GSI2 SK |
|---|---|---|---|---|
| **Employee** | employeeId, firstName, lastName, email, phone, role, status, hireDate | `[orgId, employeeId]` | `[orgId, status]` / `[employeeId]` | `[orgId, employeeId]` |
| **Servicer** | servicerId, employeeId, serviceArea, maxDailyJobs, rating, status | `[orgId, servicerId]` | `[orgId, employeeId]` / `[servicerId]` | `[orgId, servicerId]` |
| **Capability** | capabilityId, employeeId, serviceTypeId, level, certificationDate | `[orgId, capabilityId]` | `[orgId, employeeId]` / `[capabilityId]` | `[orgId, capabilityId]` |
| **ServiceSchedule** | serviceScheduleId, serviceId, servicerId, scheduledDate, scheduledTime, estimatedDuration, status, completedAt | `[orgId, serviceScheduleId]` | `[orgId, servicerId]` / `[scheduledDate]` | `[orgId, serviceScheduleId]` |

### Billing Entities
| Entity | Key Attributes | PK Composite | GSI1 PK/SK | GSI2 SK |
|---|---|---|---|---|
| **Invoice** | invoiceId, customerId, invoiceNumber, invoiceDate, dueDate, subtotal, tax, total, status, lineItems[], paidAt | `[orgId, invoiceId]` | `[orgId, customerId]` / `[invoiceDate]` | `[orgId, invoiceId]` |
| **PaymentMethod** | paymentMethodId, customerId, type, last4, isDefault, status | `[orgId, paymentMethodId]` | `[orgId, customerId]` / `[paymentMethodId]` | `[orgId, paymentMethodId]` |
| **InvoiceSchedule** | invoiceScheduleId, customerId, frequency, nextInvoiceDate, dayOfMonth | `[orgId, invoiceScheduleId]` | `[orgId, customerId]` / `[invoiceScheduleId]` | `[orgId, invoiceScheduleId]` |

### Payroll Entities
| Entity | Key Attributes | PK Composite | GSI1 PK/SK | GSI2 SK |
|---|---|---|---|---|
| **Pay** | payId, employeeId, payScheduleId, payType, rate, effectiveDate | `[orgId, payId]` | `[orgId, employeeId]` / `[payId]` | `[orgId, payId]` |
| **PaySchedule** | payScheduleId, name, frequency, dayOfWeek, dayOfMonth | `[orgId, payScheduleId]` | `[orgId]` / `[payScheduleId]` | `[orgId, payScheduleId]` |

## DynamoDB Single Table Design

- Single table: `VersaTable-{stageName}` with `pk`/`sk` + 2 GSIs
- **PK**: Always starts with `[organizationId, ...]` — data partitioned by tenant
- **GSI1**: `gsi1pk`/`gsi1sk` — cross-entity lookups within an org (e.g., `[orgId, customerId]` → properties)
- **GSI2**: `gsi2pk`/`gsi2sk` — cross-org queries for super admin (pk = service prefix, sk = `[orgId, entityId]`)
- All entities use ElectroDB with `service: 'versa'`
- All monetary values stored in cents (integers)
- Location is embedded in Property (not a separate entity)
- Identity = Cognito (Account stores cognitoUserId)
- All list operations use `query` (not `scan`) with `organizationId` as the partition prefix

## API Endpoints

### Organizations (SuperAdmin only)
- `POST/GET /organizations`, `GET/PUT/DELETE /organizations/{id}`
- `GET/PUT /organizations/{id}/config`
- `GET /organizations/{id}/secrets`, `PUT /organizations/{id}/secrets/{key}`

### Lookup Entities
- `POST/GET /property-types`, `GET/PUT/DELETE /property-types/{id}`
- `POST/GET /service-types`, `GET/PUT/DELETE /service-types/{id}`
- `POST/GET /cost-types`, `GET/PUT/DELETE /cost-types/{id}`

### Customer & Account
- `POST/GET /customers`, `GET/PUT/DELETE /customers/{id}`
- `GET /customers/{id}/account`
- `POST/GET /accounts/{id}/delegates`, `DELETE /delegates/{id}`

### Property
- `POST /customers/{customerId}/properties`, `GET /customers/{customerId}/properties`
- `GET/PUT/DELETE /properties/{id}`

### Plan & Services
- `POST/GET /plans`, `GET/PUT/DELETE /plans/{id}`
- `POST/GET /plans/{id}/services`, `DELETE /plans/{planId}/services/{serviceTypeId}`
- `POST/GET /properties/{id}/services`, `GET/PUT/DELETE /property-services/{id}`
- `POST/GET /property-services/{id}/costs`, `DELETE /costs/{id}`

### Employee & Scheduling
- `POST/GET /employees`, `GET/PUT/DELETE /employees/{id}`
- `POST /employees/{id}/servicer`, `GET/PUT /servicers/{id}`
- `POST/GET /employees/{id}/capabilities`, `DELETE /capabilities/{id}`
- `POST/GET /service-schedules`, `GET/PUT /service-schedules/{id}`

### Billing
- `POST/GET /invoices`, `GET/PUT /invoices/{id}`
- `POST/GET /customers/{id}/payment-methods`, `DELETE /payment-methods/{id}`
- `POST/GET /customers/{id}/invoice-schedules`, `PUT/DELETE /invoice-schedules/{id}`

### Payroll
- `POST/GET /employees/{id}/pay`, `PUT/DELETE /pay/{id}`
- `POST/GET /pay-schedules`, `GET/PUT/DELETE /pay-schedules/{id}`

## EventBridge Events (source: `versa.api`)

All events include `organizationId` in the detail payload.

- `OrganizationCreated`, `OrganizationSuspended`, `OrganizationConfigUpdated`
- `CustomerCreated`, `CustomerStatusChanged`
- `DelegateAdded`, `DelegateRemoved`
- `PropertyCreated`, `PropertyUpdated`
- `PlanCreated`, `PropertyServiceActivated`, `PropertyServiceCancelled`, `CostAdded`
- `EmployeeCreated`, `ServiceScheduleCreated`, `ServiceScheduleCompleted`
- `InvoiceCreated`, `InvoicePaid`, `InvoiceOverdue`, `PaymentMethodAdded`

## CDK Stacks (infra/)

- **AuthStack**: Cognito User Pool (6 groups: SuperAdmin, Admin, Manager, User, Servicer, Customer), Verified Permissions policy store (Cedar), Pre Token Generation Lambda trigger (injects `organizationId` into access tokens), `custom:organizationId` user attribute
- **InfraStack**: API Gateway + WAF, DynamoDB (+ 2 GSIs), Lambda functions (including Organization CRUD + config + secrets), EventBridge, S3, CloudWatch, Secrets Manager permissions for `versa/org/*`
- **FrontendStack**: S3 + CloudFront

## Key Business Logic

- Customer creation creates Customer + Account via DynamoDB TransactWrite
- All monetary values in cents (integers) to avoid floating point issues
- Plan pricing: monthlyPrice and annualPrice stored in cents
- Cost amounts in cents, linked to PropertyService + CostType
- Invoice totals: subtotal + tax = total (all cents)

## Standards

- Hexagonal architecture for all Lambda handlers
- ElectroDB for DynamoDB access patterns
- Zod for all input validation
- pnpm workspaces for dependency management
- Conventional commits (commitlint + Commitizen)
- ESLint flat config in each workspace
- Vitest for backend + frontend tests
- Jest for CDK infrastructure tests
- Must have at least 90% code coverage
- CI/CD runs lint, test, etc.

## CI/CD Pipeline

Leverage a dev branch for test deployment and main branch for prod. Dev is a persistent branch and merging to main triggers prod deploy. Opening a PR from dev to main triggers dev deploy. Otherwise develop locally.
