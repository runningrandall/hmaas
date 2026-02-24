# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Versa - a premium property management company for home and commercial property (future commercial). We offer all your property management needs (lawn, window cleaning, pest control, fertilizer, sprinkler, winterizing, etc.) in one single bundle that saves you money and time.

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

## Entity Model

### Lookup Entities (reference data)
| Entity | Key Attributes | PK/SK Pattern |
|---|---|---|
| **PropertyType** | propertyTypeId, name, description | `PROPERTY_TYPE#<id>` / `PROPERTY_TYPE#<id>` |
| **ServiceType** | serviceTypeId, name, description, category | `SERVICE_TYPE#<id>` / `SERVICE_TYPE#<id>` |
| **CostType** | costTypeId, name, description | `COST_TYPE#<id>` / `COST_TYPE#<id>` |

### Core Entities
| Entity | Key Attributes | PK/SK Pattern | GSI1 |
|---|---|---|---|
| **Customer** | customerId, firstName, lastName, email, phone, status, notes | `CUSTOMER#<id>` / `CUSTOMER#<id>` | `CUSTOMER_STATUS#<status>` / `CUSTOMER#<id>` |
| **Account** | accountId, customerId, cognitoUserId, planId, status, billingEmail | `ACCOUNT#<id>` / `ACCOUNT#<id>` | `CUSTOMER#<customerId>` / `ACCOUNT#<id>` |
| **Delegate** | delegateId, accountId, email, name, permissions[], status | `DELEGATE#<id>` / `DELEGATE#<id>` | `ACCOUNT#<accountId>` / `DELEGATE#<id>` |
| **Property** | propertyId, customerId, propertyTypeId, name, address, city, state, zip, lat, lng, lotSize, notes, status | `PROPERTY#<id>` / `PROPERTY#<id>` | `CUSTOMER#<customerId>` / `PROPERTY#<id>` |

### Plan & Service Entities
| Entity | Key Attributes | PK/SK Pattern | GSI1 |
|---|---|---|---|
| **Plan** | planId, name, description, monthlyPrice, annualPrice, status | `PLAN#<id>` / `PLAN#<id>` | — |
| **PlanService** | planId, serviceTypeId, includedVisits, frequency | `PLAN#<planId>` / `PLAN_SERVICE#<serviceTypeId>` | — |
| **PropertyService** | serviceId, propertyId, serviceTypeId, planId, status, startDate, endDate, frequency | `PROPERTY_SERVICE#<id>` / `PROPERTY_SERVICE#<id>` | `PROPERTY#<propertyId>` / `PROPERTY_SERVICE#<id>` |
| **Cost** | costId, serviceId, costTypeId, amount, description, effectiveDate | `COST#<id>` / `COST#<id>` | `PROPERTY_SERVICE#<serviceId>` / `COST#<id>` |

### Employee & Scheduling Entities
| Entity | Key Attributes | PK/SK Pattern | GSI1 |
|---|---|---|---|
| **Employee** | employeeId, firstName, lastName, email, phone, role, status, hireDate | `EMPLOYEE#<id>` / `EMPLOYEE#<id>` | `EMPLOYEE_STATUS#<status>` / `EMPLOYEE#<id>` |
| **Servicer** | servicerId, employeeId, serviceArea, maxDailyJobs, rating, status | `SERVICER#<id>` / `SERVICER#<id>` | `EMPLOYEE#<employeeId>` / `SERVICER#<id>` |
| **Capability** | capabilityId, employeeId, serviceTypeId, level, certificationDate | `CAPABILITY#<id>` / `CAPABILITY#<id>` | `EMPLOYEE#<employeeId>` / `CAPABILITY#<id>` |
| **ServiceSchedule** | serviceScheduleId, serviceId, servicerId, scheduledDate, scheduledTime, estimatedDuration, status, completedAt | `SERVICE_SCHEDULE#<id>` / `SERVICE_SCHEDULE#<id>` | `SERVICER#<servicerId>` / `SERVICE_SCHEDULE#<scheduledDate>` |

### Billing Entities
| Entity | Key Attributes | PK/SK Pattern | GSI1 |
|---|---|---|---|
| **Invoice** | invoiceId, customerId, invoiceNumber, invoiceDate, dueDate, subtotal, tax, total, status, lineItems[], paidAt | `INVOICE#<id>` / `INVOICE#<id>` | `CUSTOMER#<customerId>` / `INVOICE#<invoiceDate>` |
| **PaymentMethod** | paymentMethodId, customerId, type, last4, isDefault, status | `PAYMENT_METHOD#<id>` / `PAYMENT_METHOD#<id>` | `CUSTOMER#<customerId>` / `PAYMENT_METHOD#<id>` |
| **InvoiceSchedule** | invoiceScheduleId, customerId, frequency, nextInvoiceDate, dayOfMonth | `INVOICE_SCHEDULE#<id>` / `INVOICE_SCHEDULE#<id>` | `CUSTOMER#<customerId>` / `INVOICE_SCHEDULE#<id>` |

### Payroll Entities
| Entity | Key Attributes | PK/SK Pattern | GSI1 |
|---|---|---|---|
| **Pay** | payId, employeeId, payScheduleId, payType, rate, effectiveDate | `PAY#<id>` / `PAY#<id>` | `EMPLOYEE#<employeeId>` / `PAY#<id>` |
| **PaySchedule** | payScheduleId, name, frequency, dayOfWeek, dayOfMonth | `PAY_SCHEDULE#<id>` / `PAY_SCHEDULE#<id>` | — |

## DynamoDB Single Table Design

- Single table: `VersaTable-{stageName}` with `pk`/`sk` + 2 GSIs
- **GSI1**: `gsi1pk`/`gsi1sk` — cross-entity lookups (e.g., properties by customer)
- **GSI2**: `gsi2pk`/`gsi2sk` — reserved for future access patterns
- All entities use ElectroDB with `service: 'versa'`
- All monetary values stored in cents (integers)
- Location is embedded in Property (not a separate entity)
- Identity = Cognito (Account stores cognitoUserId)

## API Endpoints

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

- `CustomerCreated`, `CustomerStatusChanged`
- `DelegateAdded`, `DelegateRemoved`
- `PropertyCreated`, `PropertyUpdated`
- `PlanCreated`, `PropertyServiceActivated`, `PropertyServiceCancelled`, `CostAdded`
- `EmployeeCreated`, `ServiceScheduleCreated`, `ServiceScheduleCompleted`
- `InvoiceCreated`, `InvoicePaid`, `InvoiceOverdue`, `PaymentMethodAdded`

## CDK Stacks (infra/)

- **AuthStack**: Cognito User Pool (5 groups: Admin, Manager, User, Servicer, Customer), Verified Permissions policy store
- **InfraStack**: API Gateway + WAF, DynamoDB (+ 2 GSIs), Lambda functions, EventBridge, S3, CloudWatch
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
