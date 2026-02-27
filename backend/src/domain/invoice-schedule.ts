import { PaginationOptions, PaginatedResult } from "./shared";

export type InvoiceScheduleFrequency = "monthly" | "quarterly" | "annually";

export interface InvoiceSchedule {
    organizationId: string;
    invoiceScheduleId: string;
    customerId: string;
    frequency: InvoiceScheduleFrequency;
    nextInvoiceDate: string;
    dayOfMonth?: number;
    createdAt: string;
    updatedAt?: string;
}

export interface CreateInvoiceScheduleRequest {
    customerId: string;
    frequency: InvoiceScheduleFrequency;
    nextInvoiceDate: string;
    dayOfMonth?: number;
}

export interface UpdateInvoiceScheduleRequest {
    frequency?: InvoiceScheduleFrequency;
    nextInvoiceDate?: string;
    dayOfMonth?: number;
}

export interface InvoiceScheduleRepository {
    create(schedule: InvoiceSchedule): Promise<InvoiceSchedule>;
    get(organizationId: string, invoiceScheduleId: string): Promise<InvoiceSchedule | null>;
    listByCustomerId(organizationId: string, customerId: string, options?: PaginationOptions): Promise<PaginatedResult<InvoiceSchedule>>;
    update(organizationId: string, invoiceScheduleId: string, data: UpdateInvoiceScheduleRequest): Promise<InvoiceSchedule>;
    delete(organizationId: string, invoiceScheduleId: string): Promise<void>;
}
