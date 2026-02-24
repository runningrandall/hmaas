import { InvoiceScheduleRepository, InvoiceSchedule, UpdateInvoiceScheduleRequest } from "../domain/invoice-schedule";
import { PaginationOptions, PaginatedResult } from "../domain/shared";
import { DBService } from "../entities/service";
import { z } from "zod";
import { logger } from "../lib/observability";

const DynamoInvoiceScheduleSchema = z.object({
    invoiceScheduleId: z.string(),
    customerId: z.string(),
    frequency: z.enum(["monthly", "quarterly", "annually"]),
    nextInvoiceDate: z.string(),
    dayOfMonth: z.number().optional().nullable(),
    createdAt: z.union([z.string(), z.number()]).transform(v => String(v)),
    updatedAt: z.union([z.string(), z.number()]).optional().transform(v => v != null ? String(v) : undefined),
}).passthrough();

function parseInvoiceSchedule(data: unknown): InvoiceSchedule {
    const result = DynamoInvoiceScheduleSchema.safeParse(data);
    if (!result.success) {
        logger.error("Data validation failed reading from DynamoDB", { errors: result.error.issues, data });
        throw new Error(`Data integrity error: ${result.error.message}`);
    }
    return result.data as InvoiceSchedule;
}

const DEFAULT_PAGE_SIZE = 20;

export class DynamoInvoiceScheduleRepository implements InvoiceScheduleRepository {
    async create(schedule: InvoiceSchedule): Promise<InvoiceSchedule> {
        const { createdAt, updatedAt, ...data } = schedule;
        const result = await DBService.entities.invoiceSchedule.create(data).go();
        return parseInvoiceSchedule(result.data);
    }

    async get(invoiceScheduleId: string): Promise<InvoiceSchedule | null> {
        const result = await DBService.entities.invoiceSchedule.get({ invoiceScheduleId }).go();
        if (!result.data) return null;
        return parseInvoiceSchedule(result.data);
    }

    async listByCustomerId(customerId: string, options?: PaginationOptions): Promise<PaginatedResult<InvoiceSchedule>> {
        const limit = options?.limit || DEFAULT_PAGE_SIZE;
        const result = await DBService.entities.invoiceSchedule.query.byCustomerId({ customerId }).go({
            limit,
            ...(options?.cursor && { cursor: options.cursor }),
        });
        return {
            items: result.data.map(parseInvoiceSchedule),
            cursor: result.cursor ?? null,
        };
    }

    async update(invoiceScheduleId: string, data: UpdateInvoiceScheduleRequest): Promise<InvoiceSchedule> {
        const result = await DBService.entities.invoiceSchedule.patch({ invoiceScheduleId }).set(data).go({ response: "all_new" });
        return parseInvoiceSchedule(result.data);
    }

    async delete(invoiceScheduleId: string): Promise<void> {
        await DBService.entities.invoiceSchedule.delete({ invoiceScheduleId }).go();
    }
}
