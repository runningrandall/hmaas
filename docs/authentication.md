# Authentication & Authorization

This project uses a modern serverless authentication stack combining **Amazon Cognito** for identity management and **Amazon Verified Permissions (AVP)** for fine-grained authorization.

## Architecture

1.  **Identity (Who are you?)**: Amazon Cognito User Pool handles sign-up, sign-in, and JWT issuance.
2.  **Authorization (What can you do?)**: Amazon Verified Permissions evaluates Cedar policies to allow/deny actions.
3.  **Enforcement**: A Lambda Authorizer intercepts every API request, validates the JWT, and queries AVP for a decision.

## Cognito (Identity)

- **User Pool**: Manages users with email sign-in, self-sign-up enabled, auto-verified email.
- **Password Policy**: Minimum 8 characters, requires uppercase, lowercase, and digits.
- **App Client**: Used by the frontend to authenticate.
- **Triggers**: Pre-sign-up or post-confirmation triggers can be added in `infra/lib/auth-stack.ts`.

### User Groups

| Group | Description |
|---|---|
| **Admin** | Full system access |
| **Manager** | Manage customers, properties, plans, schedules, invoices, lookups |
| **User** | Read own profile only |
| **Servicer** | View schedules, view own data, read profile |
| **Customer** | View own data, read profile |

## Verified Permissions (Authorization)

We use the [Cedar](https://www.cedarpolicy.com/) policy language with namespace `Versa`.

### Policy Store
Defined in `infra/lib/auth-stack.ts`.

### Schema
- **Entity Types**: `User` (with `groups: Set<String>` attribute), `Resource`.
- **Actions**: `ReadDashboard`, `ManageUsers`, `ReadProfile`, `ManageCustomers`, `ManageProperties`, `ManagePlans`, `ManageEmployees`, `ManageSchedules`, `ManageInvoices`, `ManageLookups`, `ViewSchedules`, `ViewOwnData`.

### Policies by Group

**Admin** — Full access to all actions and resources:
```cedar
permit(
    principal,
    action,
    resource
) when { principal.groups.contains("Admin") };
```

**Manager** — Operational management access:
```cedar
permit(
    principal,
    action in [
        Action::"ReadDashboard",
        Action::"ManageUsers",
        Action::"ManageCustomers",
        Action::"ManageProperties",
        Action::"ManagePlans",
        Action::"ManageSchedules",
        Action::"ManageInvoices",
        Action::"ManageLookups"
    ],
    resource
) when { principal.groups.contains("Manager") };
```

**User** — Profile read only:
```cedar
permit(
    principal,
    action in [Action::"ReadProfile"],
    resource
) when { principal.groups.contains("User") };
```

**Servicer** — View schedules and own data:
```cedar
permit(
    principal,
    action in [
        Action::"ViewSchedules",
        Action::"ViewOwnData",
        Action::"ReadProfile"
    ],
    resource
) when { principal.groups.contains("Servicer") };
```

**Customer** — View own data:
```cedar
permit(
    principal,
    action in [
        Action::"ViewOwnData",
        Action::"ReadProfile"
    ],
    resource
) when { principal.groups.contains("Customer") };
```

## Lambda Authorizer (`backend/src/auth/authorizer.ts`)

The authorizer performs the following steps:
1.  **Validates JWT**: Checks signature, expiration, and issuer.
2.  **Maps Request to Action**:
    - `GET /customers` -> `ManageCustomers`
    - `POST /properties` -> `ManageProperties`
    - `GET /service-schedules` -> `ViewSchedules`
    - (Mapping logic is in `authorizer.ts`)
3.  **Evaluates Policy**: Calls `verifiedpermissions:IsAuthorized` with the Principal (User ID), Action, and Resource.
4.  **Returns Policy**: Generates an IAM Policy Allow/Deny for API Gateway.

## Adding New Roles/Permissions

1.  Update the Schema in `infra/lib/auth-stack.ts` if adding new Actions.
2.  Update the Policy definition in `infra/lib/auth-stack.ts`.
3.  Update the mapping logic in `backend/src/auth/authorizer.ts` to map API routes to new Actions.
