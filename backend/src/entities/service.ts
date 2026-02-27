import { Service } from "electrodb";
import { client } from "../clients/dynamodb";
import { PropertyTypeEntity } from "./property-type";
import { ServiceTypeEntity } from "./service-type";
import { CostTypeEntity } from "./cost-type";
import { CustomerEntity } from "./customer";
import { AccountEntity } from "./account";
import { DelegateEntity } from "./delegate";
import { PropertyEntity } from "./property";
import { PlanEntity } from "./plan";
import { PlanServiceEntity } from "./plan-service";
import { PropertyServiceEntity } from "./property-service";
import { CostEntity } from "./cost";
import { EmployeeEntity } from "./employee";
import { ServicerEntity } from "./servicer";
import { CapabilityEntity } from "./capability";
import { ServiceScheduleEntity } from "./service-schedule";
import { PayEntity } from "./pay";
import { PayScheduleEntity } from "./pay-schedule";
import { InvoiceEntity } from "./invoice";
import { PaymentMethodEntity } from "./payment-method";
import { InvoiceScheduleEntity } from "./invoice-schedule";
import { OrganizationEntity } from "./organization";

export const DBService = new Service(
    {
        organization: OrganizationEntity,
        propertyType: PropertyTypeEntity,
        serviceType: ServiceTypeEntity,
        costType: CostTypeEntity,
        customer: CustomerEntity,
        account: AccountEntity,
        delegate: DelegateEntity,
        property: PropertyEntity,
        plan: PlanEntity,
        planService: PlanServiceEntity,
        propertyService: PropertyServiceEntity,
        cost: CostEntity,
        employee: EmployeeEntity,
        servicer: ServicerEntity,
        capability: CapabilityEntity,
        serviceSchedule: ServiceScheduleEntity,
        pay: PayEntity,
        paySchedule: PayScheduleEntity,
        invoice: InvoiceEntity,
        paymentMethod: PaymentMethodEntity,
        invoiceSchedule: InvoiceScheduleEntity,
    },
    { client, table: process.env.TABLE_NAME || "versa-table" }
);
