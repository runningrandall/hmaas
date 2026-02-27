import { CostRepository, Cost } from "../domain/cost";
import { PaginationOptions, PaginatedResult } from "../domain/shared";
import { DBService } from "../entities/service";
import { z } from "zod";
import { logger } from "../lib/observability";

const DynamoCostSchema = z.object({
    organizationId: z.string(),
    costId: z.string(),
    serviceId: z.string(),
    costTypeId: z.string(),
    amount: z.number(),
    description: z.string().optional().nullable(),
    effectiveDate: z.string().optional().nullable(),
    createdAt: z.union([z.string(), z.number()]).transform(v => String(v)),
    updatedAt: z.union([z.string(), z.number()]).optional().transform(v => v != null ? String(v) : undefined),
}).passthrough();

function parseCost(data: unknown): Cost {
    const result = DynamoCostSchema.safeParse(data);
    if (!result.success) {
        logger.error("Data validation failed reading from DynamoDB", { errors: result.error.issues, data });
        throw new Error(`Data integrity error: ${result.error.message}`);
    }
    return result.data as Cost;
}

const DEFAULT_PAGE_SIZE = 20;

export class DynamoCostRepository implements CostRepository {
    async create(cost: Cost): Promise<Cost> {
        const { createdAt, updatedAt, ...data } = cost;
        const result = await DBService.entities.cost.create(data).go();
        return parseCost(result.data);
    }

    async get(organizationId: string, costId: string): Promise<Cost | null> {
        const result = await DBService.entities.cost.get({ organizationId, costId }).go();
        if (!result.data) return null;
        return parseCost(result.data);
    }

    async listByServiceId(organizationId: string, serviceId: string, options?: PaginationOptions): Promise<PaginatedResult<Cost>> {
        const limit = options?.limit || DEFAULT_PAGE_SIZE;
        const result = await DBService.entities.cost.query.byServiceId({ organizationId, serviceId }).go({
            limit,
            ...(options?.cursor && { cursor: options.cursor }),
        });
        return {
            items: result.data.map(parseCost),
            cursor: result.cursor ?? null,
        };
    }

    async delete(organizationId: string, costId: string): Promise<void> {
        await DBService.entities.cost.delete({ organizationId, costId }).go();
    }
}
