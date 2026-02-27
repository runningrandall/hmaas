# Versa Application Architecture

Full-stack serverless architecture on AWS.

```mermaid
flowchart TD
    Browser["Browser"]

    subgraph Frontend["Frontend (FrontendStack)"]
        CF["CloudFront CDN"]
        S3["S3 Static Assets"]
        NextJS["Next.js 16 App Router"]
    end

    subgraph API["API Layer (InfraStack)"]
        APIGW["API Gateway REST API"]
        WAF["AWS WAF"]
        AuthZ["Lambda Authorizer"]
    end

    subgraph Auth["Auth (AuthStack)"]
        Cognito["Cognito User Pool"]
        AVP["Verified Permissions\n(Cedar Policies)"]
    end

    subgraph Compute["Lambda Functions (6 Nested Stacks)"]
        Lookup["Lookup Lambdas\n(PropertyType, ServiceType, CostType)"]
        CustomerL["Customer Lambdas\n(Customer, Account, Delegate)"]
        PropertyL["Property Lambdas\n(Property)"]
        PlanL["Plan Lambdas\n(Plan, PlanService, PropertyService, Cost)"]
        WorkforceL["Workforce Lambdas\n(Employee, Servicer, Capability, Schedule)"]
        BillingL["Billing Lambdas\n(Invoice, PaymentMethod, InvoiceSchedule, Pay, PaySchedule)"]
    end

    subgraph Data["Data Layer"]
        DDB["DynamoDB Single Table\n(VersaTable + 2 GSIs)"]
    end

    subgraph Events["Event-Driven Messaging"]
        EB["EventBridge\n(versa.api)"]
        ProcessEvent["processEvent Lambda"]
        DLQ["SQS Dead Letter Queue"]
    end

    subgraph Observability["Observability"]
        CW["CloudWatch\nDashboards & Alarms"]
        SNS["SNS Notifications"]
        XRay["X-Ray Tracing"]
    end

    Browser --> CF
    CF --> S3
    S3 -.- NextJS
    Browser --> APIGW
    WAF --> APIGW
    APIGW --> AuthZ
    AuthZ --> Cognito
    AuthZ --> AVP
    APIGW --> Compute
    Compute --> DDB
    Compute --> EB
    EB --> ProcessEvent
    ProcessEvent --> DLQ
    Compute --> CW
    CW --> SNS
    Compute --> XRay
```

## Infrastructure Stacks (CDK)

| Stack | Purpose | Naming |
|---|---|---|
| **AuthStack** | Cognito User Pool, 5 groups, Verified Permissions policy store | `VersaAuthStack-{stage}` |
| **InfraStack** | API Gateway, WAF, DynamoDB, Lambda functions (6 nested stacks), EventBridge, CloudWatch | `VersaInfraStack-{stage}` |
| **FrontendStack** | S3 bucket, CloudFront distribution (per-stage) | `VersaFrontendStack-{stage}` |

## Lambda Nested Stacks

Each domain group is deployed as a `LambdaStack` (NestedStack) within InfraStack:

| Stack | Entities |
|---|---|
| **LookupLambdas** | PropertyType, ServiceType, CostType |
| **CustomerLambdas** | Customer, Account, Delegate |
| **PropertyLambdas** | Property |
| **PlanLambdas** | Plan, PlanService, PropertyService, Cost |
| **WorkforceLambdas** | Employee, Servicer, Capability, ServiceSchedule |
| **BillingLambdas** | Invoice, PaymentMethod, InvoiceSchedule, Pay, PaySchedule |

All Lambdas run on Node.js 22 (ARM_64) with X-Ray tracing, DLQ, and auto-granted DynamoDB + EventBridge access.
