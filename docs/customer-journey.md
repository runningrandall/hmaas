# Customer Journey

Sequence diagram showing the flow from website visitor to paying customer.

```mermaid
sequenceDiagram
    actor Visitor
    participant CF as CloudFront + S3
    participant App as Next.js App
    participant Cognito
    participant APIGW as API Gateway
    participant Lambda
    participant DDB as DynamoDB
    participant EB as EventBridge

    Note over Visitor, CF: 1. Browse Website
    Visitor->>CF: Visit site
    CF->>App: Serve static assets

    Note over Visitor, Cognito: 2. Sign Up
    Visitor->>Cognito: Sign up (email + password)
    Cognito-->>Visitor: Verification email
    Visitor->>Cognito: Verify email
    Cognito-->>Visitor: Account confirmed

    Note over Visitor, Cognito: 3. Log In
    Visitor->>Cognito: Log in
    Cognito-->>Visitor: JWT (id + access tokens)

    Note over Visitor, EB: 4. Create Customer Profile
    Visitor->>APIGW: POST /customers (JWT)
    APIGW->>Lambda: createCustomer
    Lambda->>DDB: TransactWrite (Customer + Account)
    DDB-->>Lambda: Success
    Lambda->>EB: CustomerCreated
    Lambda-->>APIGW: 201 Created
    APIGW-->>Visitor: Customer + Account response

    Note over Visitor, EB: 5. Add Property
    Visitor->>APIGW: POST /customers/{id}/properties
    APIGW->>Lambda: createProperty
    Lambda->>DDB: Put Property
    Lambda->>EB: PropertyCreated
    Lambda-->>APIGW: 201 Created
    APIGW-->>Visitor: Property response

    Note over Visitor, DDB: 6. Select Plan
    Visitor->>APIGW: GET /plans
    APIGW->>Lambda: listPlans
    Lambda->>DDB: Query Plans
    Lambda-->>APIGW: Plan list
    APIGW-->>Visitor: Available plans
    Visitor->>APIGW: PUT /accounts/{id} (planId)
    APIGW->>Lambda: Update Account with Plan
    Lambda->>DDB: Update Account
    Lambda-->>APIGW: 200 OK

    Note over Visitor, EB: 7. Activate Property Services
    Visitor->>APIGW: POST /properties/{id}/services
    APIGW->>Lambda: createPropertyService
    Lambda->>DDB: Put PropertyService
    Lambda->>EB: PropertyServiceActivated
    Lambda-->>APIGW: 201 Created
    APIGW-->>Visitor: PropertyService response

    Note over Visitor, EB: 8. Invoice Generated
    Lambda->>DDB: Put Invoice
    Lambda->>EB: InvoiceCreated
    Lambda-->>APIGW: 201 Created

    Note over Visitor, EB: 9. Add Payment Method
    Visitor->>APIGW: POST /customers/{id}/payment-methods
    APIGW->>Lambda: createPaymentMethod
    Lambda->>DDB: Put PaymentMethod
    Lambda->>EB: PaymentMethodAdded
    Lambda-->>APIGW: 201 Created

    Note over Visitor, EB: 10. Pay Invoice
    Visitor->>APIGW: PUT /invoices/{id} (status: paid)
    APIGW->>Lambda: updateInvoice
    Lambda->>DDB: Update Invoice (paidAt, status)
    Lambda->>EB: InvoicePaid
    Lambda-->>APIGW: 200 OK
    APIGW-->>Visitor: Invoice paid confirmation
```

## Journey Steps

| Step | Action | API | Event |
|---|---|---|---|
| 1 | Browse website | CloudFront -> S3 | -- |
| 2 | Sign up | Cognito | -- |
| 3 | Log in | Cognito -> JWT | -- |
| 4 | Create profile | `POST /customers` | `CustomerCreated` |
| 5 | Add property | `POST /customers/{id}/properties` | `PropertyCreated` |
| 6 | Select plan | `GET /plans` + `PUT /accounts/{id}` | -- |
| 7 | Activate services | `POST /properties/{id}/services` | `PropertyServiceActivated` |
| 8 | Invoice generated | `POST /invoices` | `InvoiceCreated` |
| 9 | Add payment | `POST /customers/{id}/payment-methods` | `PaymentMethodAdded` |
| 10 | Pay invoice | `PUT /invoices/{id}` | `InvoicePaid` |
