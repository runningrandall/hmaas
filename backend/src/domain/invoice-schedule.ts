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
