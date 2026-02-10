# Code Generation

This project uses [Plop](https://plopjs.com/) to scaffold boilerplate code.

Run generators with:

```bash
pnpm generate
```

## Available Generators

### `entity` — Full Hexagonal Architecture Stack

Scaffolds a complete CRUD entity with all layers of hexagonal architecture.

```bash
pnpm generate entity
# Prompt: Entity name (singular, e.g. order, user, comment)
```

**Generated files** (example: `order`):

| Layer | File | Purpose |
|---|---|---|
| Domain | `backend/src/domain/order.ts` | Types (`Order`, `CreateOrderRequest`) and `OrderRepository` interface |
| Entity | `backend/src/entities/order.ts` | ElectroDB entity definition |
| Schema | `backend/src/lib/order-schemas.ts` | Zod validation schema |
| Adapter | `backend/src/adapters/dynamo-order-repository.ts` | DynamoDB repository implementation |
| Service | `backend/src/application/order-service.ts` | Business logic (create, get, list, delete) |
| Handlers | `backend/src/handlers/createOrder.ts` | Lambda handler for POST |
| | `backend/src/handlers/getOrder.ts` | Lambda handler for GET by ID |
| | `backend/src/handlers/listOrders.ts` | Lambda handler for GET all |
| | `backend/src/handlers/deleteOrder.ts` | Lambda handler for DELETE |
| Tests | `backend/test/handlers/createOrder.test.ts` | Unit test (mocks `OrderService`) |
| | `backend/test/handlers/getOrder.test.ts` | Unit test |
| | `backend/test/handlers/listOrders.test.ts` | Unit test |
| | `backend/test/handlers/deleteOrder.test.ts` | Unit test |

#### After Generation Checklist

After running the generator, you must manually:

1. **Register the entity in `DBService`** (`backend/src/entities/service.ts`):
   ```typescript
   import { OrderEntity } from "./order";

   export const DBService = new Service({
       item: ItemEntity,
       order: OrderEntity,  // ← add here
   }, { client, table });
   ```

2. **Add Lambda functions to CDK** (`infra/lib/infra-stack.ts`):
   ```typescript
   const createOrderLambda = new nodejs.NodejsFunction(this, 'createOrderLambda', {
       entry: path.join(backendPath, 'createOrder.ts'),
       ...commonProps,
   });
   table.grantWriteData(createOrderLambda);
   ```

3. **Add API Gateway routes** (`infra/lib/infra-stack.ts`):
   ```typescript
   const orders = api.root.addResource('orders');
   orders.addMethod('GET', new apigateway.LambdaIntegration(listOrdersLambda), { authorizer });
   orders.addMethod('POST', new apigateway.LambdaIntegration(createOrderLambda), { authorizer });

   const order = orders.addResource('{orderId}');
   order.addMethod('GET', new apigateway.LambdaIntegration(getOrderLambda), { authorizer });
   order.addMethod('DELETE', new apigateway.LambdaIntegration(deleteOrderLambda), { authorizer });
   ```

---

### `endpoint` — Single Handler

Creates a single Lambda handler and its unit test. Use this for one-off endpoints that don't follow the full entity CRUD pattern.

```bash
pnpm generate endpoint
# Prompt: Endpoint name, HTTP method
```

---

### `component` — React Component + Storybook

Creates a React component with an index barrel file and a Storybook story.

```bash
pnpm generate component
# Prompt: Component name (PascalCase)
```

**Generated files** (example: `UserCard`):
- `frontend/components/UserCard/UserCard.tsx`
- `frontend/components/UserCard/index.ts`
- `frontend/stories/UserCard.stories.tsx`
