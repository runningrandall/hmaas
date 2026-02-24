import { PaginationOptions, PaginatedResult } from "./shared";

export type InvoiceScheduleFrequency = "monthly" | "quarterly" | "annually";

export interface InvoiceSchedule {
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
    get(invoiceScheduleId: string): Promise<InvoiceSchedule | null>;
    listByCustomerId(customerId: string, options?: PaginationOptions): Promise<PaginatedResult<InvoiceSchedule>>;
    update(invoiceScheduleId: string, data: UpdateInvoiceScheduleRequest): Promise<InvoiceSchedule>;
    delete(invoiceScheduleId: string): Promise<void>;
}
