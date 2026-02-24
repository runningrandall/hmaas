import { PayScheduleRepository, PaySchedule, UpdatePayScheduleRequest } from "../domain/pay-schedule";
import { PaginationOptions, PaginatedResult } from "../domain/shared";
import { DBService } from "../entities/service";
import { z } from "zod";
import { logger } from "../lib/observability";

const DynamoPayScheduleSchema = z.object({
    payScheduleId: z.string(),
    name: z.string(),
    frequency: z.enum(["weekly", "biweekly", "semimonthly", "monthly"]),
    dayOfWeek: z.number().optional().nullable(),
    dayOfMonth: z.number().optional().nullable(),
    createdAt: z.union([z.string(), z.number()]).transform(v => String(v)),
    updatedAt: z.union([z.string(), z.number()]).optional().transform(v => v != null ? String(v) : undefined),
}).passthrough();

function parsePaySchedule(data: unknown): PaySchedule {
    const result = DynamoPayScheduleSchema.safeParse(data);
    if (!result.success) {
        logger.error("Data validation failed reading from DynamoDB", { errors: result.error.issues, data });
        throw new Error(`Data integrity error: ${result.error.message}`);
    }
    return result.data as PaySchedule;
}

const DEFAULT_PAGE_SIZE = 20;

export class DynamoPayScheduleRepository implements PayScheduleRepository {
    async create(paySchedule: PaySchedule): Promise<PaySchedule> {
        const { createdAt, updatedAt, ...data } = paySchedule;
        const result = await DBService.entities.paySchedule.create(data).go();
        return parsePaySchedule(result.data);
    }

    async get(payScheduleId: string): Promise<PaySchedule | null> {
        const result = await DBService.entities.paySchedule.get({ payScheduleId }).go();
        if (!result.data) return null;
        return parsePaySchedule(result.data);
    }

    async list(options?: PaginationOptions): Promise<PaginatedResult<PaySchedule>> {
        const limit = options?.limit || DEFAULT_PAGE_SIZE;
        const result = await DBService.entities.paySchedule.scan.go({
            limit,
            ...(options?.cursor && { cursor: options.cursor }),
        });
        return {
            items: result.data.map(parsePaySchedule),
            cursor: result.cursor ?? null,
        };
    }

    async update(payScheduleId: string, data: UpdatePayScheduleRequest): Promise<PaySchedule> {
        const result = await DBService.entities.paySchedule.patch({ payScheduleId }).set(data).go({ response: "all_new" });
        return parsePaySchedule(result.data);
    }

    async delete(payScheduleId: string): Promise<void> {
        await DBService.entities.paySchedule.delete({ payScheduleId }).go();
    }
}
