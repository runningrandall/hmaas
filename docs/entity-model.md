# Versa Entity Model

Customer-centric entity relationship diagram showing all Versa domain entities and their relationships.

```mermaid
erDiagram
    Customer ||--|| Account : "has"
    Account ||--o{ Delegate : "grants access via"
    Account }o--|| Plan : "subscribes to"
    Customer ||--o{ Property : "owns"
    Customer ||--o{ Invoice : "billed via"
    Customer ||--o{ PaymentMethod : "pays with"
    Customer ||--o{ InvoiceSchedule : "billed on"
    Plan ||--o{ PlanService : "includes"
    PlanService }o--|| ServiceType : "defines"
    Property }o--|| PropertyType : "classified as"
    Property ||--o{ PropertyService : "receives"
    PropertyService }o--|| ServiceType : "of type"
    PropertyService ||--o{ Cost : "incurs"
    Cost }o--|| CostType : "categorized as"
    PropertyService ||--o{ ServiceSchedule : "scheduled as"
    ServiceSchedule }o--|| Servicer : "assigned to"
    Servicer ||--|| Employee : "is a"
    Employee ||--o{ Capability : "qualified for"
    Capability }o--|| ServiceType : "performs"
    Employee ||--o{ Pay : "compensated via"
    Pay }o--|| PaySchedule : "follows"
```

## Entity Groups

| Group | Entities |
|---|---|
| **Core** | Customer, Account, Delegate, Property |
| **Plans & Services** | Plan, PlanService, PropertyService, Cost |
| **Lookup** | PropertyType, ServiceType, CostType |
| **Workforce** | Employee, Servicer, Capability, ServiceSchedule |
| **Billing** | Invoice, PaymentMethod, InvoiceSchedule |
| **Payroll** | Pay, PaySchedule |

## Key Relationships

- A **Customer** has exactly one **Account** (created together via TransactWrite)
- An **Account** subscribes to a **Plan**, which defines available services via **PlanService**
- A **Property** receives **PropertyServices**, each of a specific **ServiceType**
- Each **PropertyService** can incur **Costs** and be scheduled as **ServiceSchedules**
- **Employees** become **Servicers** and are assigned to schedules based on their **Capabilities**
- All monetary values (Plan prices, Costs, Invoice totals) are stored in cents
