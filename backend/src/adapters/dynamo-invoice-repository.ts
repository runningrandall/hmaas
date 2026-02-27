import { InvoiceRepository, Invoice, UpdateInvoiceRequest } from "../domain/invoice";
import { PaginationOptions, PaginatedResult } from "../domain/shared";
import { DBService } from "../entities/service";
import { z } from "zod";
import { logger } from "../lib/observability";

const DynamoLineItemSchema = z.object({
    description: z.string(),
    quantity: z.number(),
    unitPrice: z.number(),
    total: z.number(),
});

const DynamoInvoiceSchema = z.object({
    organizationId: z.string(),
    invoiceId: z.string(),
    customerId: z.string(),
    invoiceNumber: z.string(),
    invoiceDate: z.string(),
    dueDate: z.string(),
    subtotal: z.number(),
    tax: z.number(),
    total: z.number(),
    status: z.enum(["draft", "sent", "paid", "overdue", "cancelled"]),
    lineItems: z.array(DynamoLineItemSchema).optional().nullable(),
    paidAt: z.string().optional().nullable(),
    createdAt: z.union([z.string(), z.number()]).transform(v => String(v)),
    updatedAt: z.union([z.string(), z.number()]).optional().transform(v => v != null ? String(v) : undefined),
}).passthrough();

function parseInvoice(data: unknown): Invoice {
    const result = DynamoInvoiceSchema.safeParse(data);
    if (!result.success) {
        logger.error("Data validation failed reading from DynamoDB", { errors: result.error.issues, data });
        throw new Error(`Data integrity error: ${result.error.message}`);
    }
    return result.data as Invoice;
}

const DEFAULT_PAGE_SIZE = 20;

export class DynamoInvoiceRepository implements InvoiceRepository {
    async create(invoice: Invoice): Promise<Invoice> {
        const { createdAt, updatedAt, ...data } = invoice;
        const result = await DBService.entities.invoice.create(data).go();
        return parseInvoice(result.data);
    }

    async get(organizationId: string, invoiceId: string): Promise<Invoice | null> {
        const result = await DBService.entities.invoice.get({ organizationId, invoiceId }).go();
        if (!result.data) return null;
        return parseInvoice(result.data);
    }

    async listByCustomerId(organizationId: string, customerId: string, options?: PaginationOptions): Promise<PaginatedResult<Invoice>> {
        const limit = options?.limit || DEFAULT_PAGE_SIZE;
        const result = await DBService.entities.invoice.query.byCustomerId({ organizationId, customerId }).go({
            limit,
            ...(options?.cursor && { cursor: options.cursor }),
        });
        return {
            items: result.data.map(parseInvoice),
            cursor: result.cursor ?? null,
        };
    }

    async update(organizationId: string, invoiceId: string, data: UpdateInvoiceRequest): Promise<Invoice> {
        const result = await DBService.entities.invoice.patch({ organizationId, invoiceId }).set(data).go({ response: "all_new" });
        return parseInvoice(result.data);
    }
}
