import { Invoice, UpdateInvoiceRequest } from "../domain/invoice";
import { PaginationOptions, PaginatedResult } from "../domain/shared";

export interface InvoiceRepository {
    create(invoice: Invoice): Promise<Invoice>;
    get(organizationId: string, invoiceId: string): Promise<Invoice | null>;
    listByCustomerId(organizationId: string, customerId: string, options?: PaginationOptions): Promise<PaginatedResult<Invoice>>;
    update(organizationId: string, invoiceId: string, data: UpdateInvoiceRequest): Promise<Invoice>;
}
