import { PlanServiceRepository, PlanService } from "../domain/plan-service";
import { PaginationOptions, PaginatedResult } from "../domain/shared";
import { DBService } from "../entities/service";
import { z } from "zod";
import { logger } from "../lib/observability";

const DynamoPlanServiceSchema = z.object({
    planId: z.string(),
    serviceTypeId: z.string(),
    includedVisits: z.number().optional().nullable(),
    frequency: z.string().optional().nullable(),
    createdAt: z.union([z.string(), z.number()]).transform(v => String(v)),
    updatedAt: z.union([z.string(), z.number()]).optional().transform(v => v != null ? String(v) : undefined),
}).passthrough();

function parsePlanService(data: unknown): PlanService {
    const result = DynamoPlanServiceSchema.safeParse(data);
    if (!result.success) {
        logger.error("Data validation failed reading from DynamoDB", { errors: result.error.issues, data });
        throw new Error(`Data integrity error: ${result.error.message}`);
    }
    return result.data as PlanService;
}

const DEFAULT_PAGE_SIZE = 20;

export class DynamoPlanServiceRepository implements PlanServiceRepository {
    async create(planService: PlanService): Promise<PlanService> {
        const { createdAt, updatedAt, ...data } = planService;
        const result = await DBService.entities.planService.create(data).go();
        return parsePlanService(result.data);
    }

    async get(planId: string, serviceTypeId: string): Promise<PlanService | null> {
        const result = await DBService.entities.planService.get({ planId, serviceTypeId }).go();
        if (!result.data) return null;
        return parsePlanService(result.data);
    }

    async listByPlanId(planId: string, options?: PaginationOptions): Promise<PaginatedResult<PlanService>> {
        const limit = options?.limit || DEFAULT_PAGE_SIZE;
        const result = await DBService.entities.planService.query.byPlanAndServiceType({ planId }).go({
            limit,
            ...(options?.cursor && { cursor: options.cursor }),
        });
        return {
            items: result.data.map(parsePlanService),
            cursor: result.cursor ?? null,
        };
    }

    async delete(planId: string, serviceTypeId: string): Promise<void> {
        await DBService.entities.planService.delete({ planId, serviceTypeId }).go();
    }
}
