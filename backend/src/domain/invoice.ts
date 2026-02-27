import { PaginationOptions, PaginatedResult } from "./shared";

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";

export interface LineItem {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
}

export interface Invoice {
    organizationId: string;
    invoiceId: string;
    customerId: string;
    invoiceNumber: string;
    invoiceDate: string;
    dueDate: string;
    subtotal: number;
    tax: number;
    total: number;
    status: InvoiceStatus;
    lineItems?: LineItem[];
    paidAt?: string;
    createdAt: string;
    updatedAt?: string;
}

export interface CreateInvoiceRequest {
    customerId: string;
    invoiceNumber: string;
    invoiceDate: string;
    dueDate: string;
    subtotal: number;
    tax: number;
    total: number;
    lineItems?: LineItem[];
}

export interface UpdateInvoiceRequest {
    invoiceDate?: string;
    dueDate?: string;
    subtotal?: number;
    tax?: number;
    total?: number;
    status?: InvoiceStatus;
    lineItems?: LineItem[];
    paidAt?: string;
}

export interface InvoiceRepository {
    create(invoice: Invoice): Promise<Invoice>;
    get(organizationId: string, invoiceId: string): Promise<Invoice | null>;
    listByCustomerId(organizationId: string, customerId: string, options?: PaginationOptions): Promise<PaginatedResult<Invoice>>;
    update(organizationId: string, invoiceId: string, data: UpdateInvoiceRequest): Promise<Invoice>;
}
