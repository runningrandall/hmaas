# Versa Backend Architecture

This project implements a **Serverless Event-Driven Architecture** using AWS Lambda, DynamoDB, and EventBridge, following **hexagonal architecture** (ports & adapters) principles.

## 1. Hexagonal Architecture

Each entity follows a layered structure separating concerns:

```
backend/src/
├── handlers/          → Thin HTTP layer (Lambda entry points, Middy middleware)
├── application/       → Business logic services (orchestrate domain + ports)
├── domain/            → Interfaces, types, contracts (ports)
├── adapters/          → Implementations (DynamoDB repositories, EventBridge publisher)
├── entities/          → ElectroDB entity definitions (DynamoDB schema)
└── lib/               → Shared utilities (middleware, error handling, observability, Zod schemas)
```

- **Handlers** receive API Gateway events, validate input with Zod, and delegate to application services.
- **Application services** orchestrate business logic using domain ports (repository interfaces, event publishers).
- **Domain** defines interfaces and types — no implementation details.
- **Adapters** implement domain interfaces (e.g., `DynamoCustomerRepository` implements `CustomerRepository`).
- **Entities** define ElectroDB schemas for DynamoDB single-table design.

## 2. Compute: AWS Lambda

We use **Node.js 22** with **TypeScript** on ARM_64.

### Handler Pattern

Handlers are grouped by entity in `backend/src/handlers/`. They follow a functional pattern with dependency injection and Zod validation:

```typescript
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { logger, metrics } from "../../lib/observability";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { CreateCustomerSchema } from "../../lib/customer-schemas";
import { commonMiddleware } from "../../lib/middleware";
import { AppError } from "../../lib/error";
import { DynamoCustomerRepository } from "../../adapters/dynamo-customer-repository";
import { DynamoAccountRepository } from "../../adapters/dynamo-account-repository";
import { EventBridgePublisher } from "../../adapters/event-bridge-publisher";
import { CustomerService } from "../../application/customer-service";

// Singletons outside handler for warm Lambda reuse
const customerRepo = new DynamoCustomerRepository();
const accountRepo = new DynamoAccountRepository();
const publisher = new EventBridgePublisher(process.env.EVENT_BUS_NAME || "");
const service = new CustomerService(customerRepo, accountRepo, publisher);

const baseHandler = async (
  event: APIGatewayProxyEvent,
  context: any
): Promise<APIGatewayProxyResult> => {
  logger.addContext(context);
  const body = event.body as unknown as any;
  if (!body) throw new AppError("Missing request body", 400);

  const parseResult = CreateCustomerSchema.safeParse(body);
  if (!parseResult.success) {
    logger.warn("Validation failed", { issues: parseResult.error.issues });
    metrics.addMetric("ValidationErrors", MetricUnit.Count, 1);
    throw parseResult.error;
  }

  const result = await service.createCustomer(parseResult.data);
  return { statusCode: 201, body: JSON.stringify(result) };
};

export const handler = commonMiddleware(baseHandler);
```

### Middleware (`backend/src/lib/middleware.ts`)

We use [Middy](https://middy.js.org/) to standardize cross-cutting concerns:
- **`httpHeaderNormalizer`**: Normalizes headers to lowercase.
- **`jsonBodyParser`**: Automatically parses JSON bodies.
- **`cors`**: Standard CORS headers.
- **`logMetrics`**: Captures cold start metrics via Powertools.
- **Error Handling**: Custom `errorHandlerMiddleware` catches `AppError` and Zod errors, returning consistent error responses.

## 3. Database: DynamoDB + ElectroDB

We use a **Single Table Design** modeled with [ElectroDB](https://electrodb.dev/).

### Why ElectroDB?
ElectroDB acts as an ODM (Object Data Mapper) for DynamoDB. It handles:
- **Keys**: Auto-generating complex Partition Keys (`pk`) and Sort Keys (`sk`).
- **Typing**: Full TypeScript support for items.
- **Validation**: Schema validation before writing.

### Entity Definitions (`backend/src/entities/`)

Each entity is defined in its own file with `service: 'versa'`:

```typescript
export const CustomerEntity = new Entity(
  {
    model: {
      entity: "customer",
      version: "1",
      service: "versa",
    },
    attributes: {
      customerId: { type: "string", required: true },
      firstName: { type: "string", required: true },
      lastName: { type: "string", required: true },
      email: { type: "string", required: true },
      phone: { type: "string" },
      status: {
        type: ["active", "inactive", "suspended"] as const,
        required: true,
        default: "active",
      },
      notes: { type: "string" },
      createdAt: { type: "number", default: () => Date.now(), readOnly: true },
      updatedAt: { type: "number", watch: "*", set: () => Date.now(), readOnly: true },
    },
    indexes: {
      byCustomerId: {
        pk: { field: "pk", composite: ["customerId"] },
        sk: { field: "sk", composite: [] },
      },
      byStatus: {
        index: "gsi1",
        pk: { field: "gsi1pk", composite: ["status"] },
        sk: { field: "gsi1sk", composite: ["customerId"] },
      },
    },
  },
  { client, table }
);
```

### Seeding Data
We use a **CloudFormation Custom Resource** (`backend/src/handlers/seedData.ts`) to seed reference data when the stack is deployed.

## 4. Event-Driven Messaging: EventBridge

Decouples services using an Event Bus.

### Architecture
1. **Producer**: Lambda handlers publish domain events (e.g., `CustomerCreated`) to the Versa Event Bus via `EventBridgePublisher`.
2. **Bus**: Routes events based on rules matching source `versa.api`.
3. **Consumer**: `processEvent` Lambda is triggered by the rule.

### Code Example
```typescript
// EventBridgePublisher adapter
await this.client.send(
  new PutEventsCommand({
    Entries: [
      {
        Source: "versa.api",
        DetailType: "CustomerCreated",
        Detail: JSON.stringify({ customerId, firstName, lastName, email }),
        EventBusName: this.busName,
      },
    ],
  })
);
```

### Domain Events
- `CustomerCreated`, `CustomerStatusChanged`
- `PropertyCreated`, `PropertyUpdated`
- `PropertyServiceActivated`, `PropertyServiceCancelled`
- `InvoiceCreated`, `InvoicePaid`, `InvoiceOverdue`
- `EmployeeCreated`, `ServiceScheduleCreated`, `ServiceScheduleCompleted`
- `PaymentMethodAdded`, `DelegateAdded`, `DelegateRemoved`

## 5. Resilience: Dead Letter Queues (DLQ)

Reliability is built-in to avoid data loss.

- **Lambda DLQ**: All async Lambdas (like `processEvent`) are configured with an SQS Queue for failed invocations.
- **Retention**: Messages are kept for 14 days.
- **Alarms**: High severity alarm if messages appear in the DLQ.

## 6. Validation: Zod

We use [Zod](https://zod.dev/) for runtime schema validation. Each entity has schemas in `backend/src/lib/{entity}-schemas.ts`.

```typescript
import { z } from "zod";

export const CreateCustomerSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  notes: z.string().optional(),
});
```

Handlers use `safeParse` for validation, logging failures and incrementing `ValidationErrors` metrics before throwing.
