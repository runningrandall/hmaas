import { CostTypeRepository, CostType, UpdateCostTypeRequest } from "../domain/cost-type";
import { PaginationOptions, PaginatedResult } from "../domain/shared";
import { DBService } from "../entities/service";
import { z } from "zod";
import { logger } from "../lib/observability";

const DynamoCostTypeSchema = z.object({
    organizationId: z.string(),
    costTypeId: z.string(),
    name: z.string(),
    description: z.string().optional().nullable(),
    createdAt: z.union([z.string(), z.number()]).transform(v => String(v)),
    updatedAt: z.union([z.string(), z.number()]).optional().transform(v => v != null ? String(v) : undefined),
}).passthrough();

function parseCostType(data: unknown): CostType {
    const result = DynamoCostTypeSchema.safeParse(data);
    if (!result.success) {
        logger.error("Data validation failed reading from DynamoDB", { errors: result.error.issues, data });
        throw new Error(`Data integrity error: ${result.error.message}`);
    }
    return result.data as CostType;
}

const DEFAULT_PAGE_SIZE = 20;

export class DynamoCostTypeRepository implements CostTypeRepository {
    async create(costType: CostType): Promise<CostType> {
        const { createdAt, updatedAt, ...data } = costType;
        const result = await DBService.entities.costType.create(data).go();
        return parseCostType(result.data);
    }

    async get(organizationId: string, costTypeId: string): Promise<CostType | null> {
        const result = await DBService.entities.costType.get({ organizationId, costTypeId }).go();
        if (!result.data) return null;
        return parseCostType(result.data);
    }

    async list(organizationId: string, options?: PaginationOptions): Promise<PaginatedResult<CostType>> {
        const limit = options?.limit || DEFAULT_PAGE_SIZE;
        const result = await DBService.entities.costType.query.byCostTypeId({ organizationId }).go({
            limit,
            ...(options?.cursor && { cursor: options.cursor }),
        });
        return {
            items: result.data.map(parseCostType),
            cursor: result.cursor ?? null,
        };
    }

    async update(organizationId: string, costTypeId: string, data: UpdateCostTypeRequest): Promise<CostType> {
        const result = await DBService.entities.costType.patch({ organizationId, costTypeId }).set(data).go({ response: "all_new" });
        return parseCostType(result.data);
    }

    async delete(organizationId: string, costTypeId: string): Promise<void> {
        await DBService.entities.costType.delete({ organizationId, costTypeId }).go();
    }
}
