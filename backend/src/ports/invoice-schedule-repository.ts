import { InvoiceSchedule, UpdateInvoiceScheduleRequest } from "../domain/invoice-schedule";
import { PaginationOptions, PaginatedResult } from "../domain/shared";

export interface InvoiceScheduleRepository {
    create(schedule: InvoiceSchedule): Promise<InvoiceSchedule>;
    get(organizationId: string, invoiceScheduleId: string): Promise<InvoiceSchedule | null>;
    listByCustomerId(organizationId: string, customerId: string, options?: PaginationOptions): Promise<PaginatedResult<InvoiceSchedule>>;
    update(organizationId: string, invoiceScheduleId: string, data: UpdateInvoiceScheduleRequest): Promise<InvoiceSchedule>;
    delete(organizationId: string, invoiceScheduleId: string): Promise<void>;
}
