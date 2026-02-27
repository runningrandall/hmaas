import { PayRepository, Pay, UpdatePayRequest } from "../domain/pay";
import { PaginationOptions, PaginatedResult } from "../domain/shared";
import { DBService } from "../entities/service";
import { z } from "zod";
import { logger } from "../lib/observability";

const DynamoPaySchema = z.object({
    organizationId: z.string(),
    payId: z.string(),
    employeeId: z.string(),
    payScheduleId: z.string().optional().nullable(),
    payType: z.enum(["hourly", "salary", "commission", "bonus"]),
    rate: z.number(),
    effectiveDate: z.string(),
    createdAt: z.union([z.string(), z.number()]).transform(v => String(v)),
    updatedAt: z.union([z.string(), z.number()]).optional().transform(v => v != null ? String(v) : undefined),
}).passthrough();

function parsePay(data: unknown): Pay {
    const result = DynamoPaySchema.safeParse(data);
    if (!result.success) {
        logger.error("Data validation failed reading from DynamoDB", { errors: result.error.issues, data });
        throw new Error(`Data integrity error: ${result.error.message}`);
    }
    return result.data as Pay;
}

const DEFAULT_PAGE_SIZE = 20;

export class DynamoPayRepository implements PayRepository {
    async create(pay: Pay): Promise<Pay> {
        const { createdAt, updatedAt, ...data } = pay;
        const result = await DBService.entities.pay.create(data).go();
        return parsePay(result.data);
    }

    async get(organizationId: string, payId: string): Promise<Pay | null> {
        const result = await DBService.entities.pay.get({ organizationId, payId }).go();
        if (!result.data) return null;
        return parsePay(result.data);
    }

    async listByEmployeeId(organizationId: string, employeeId: string, options?: PaginationOptions): Promise<PaginatedResult<Pay>> {
        const limit = options?.limit || DEFAULT_PAGE_SIZE;
        const result = await DBService.entities.pay.query.byEmployeeId({ organizationId, employeeId }).go({
            limit,
            ...(options?.cursor && { cursor: options.cursor }),
        });
        return {
            items: result.data.map(parsePay),
            cursor: result.cursor ?? null,
        };
    }

    async update(organizationId: string, payId: string, data: UpdatePayRequest): Promise<Pay> {
        const result = await DBService.entities.pay.patch({ organizationId, payId }).set(data).go({ response: "all_new" });
        return parsePay(result.data);
    }

    async delete(organizationId: string, payId: string): Promise<void> {
        await DBService.entities.pay.delete({ organizationId, payId }).go();
    }
}
