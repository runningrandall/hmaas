import { PlanRepository, Plan, UpdatePlanRequest } from "../domain/plan";
import { PaginationOptions, PaginatedResult } from "../domain/shared";
import { DBService } from "../entities/service";
import { z } from "zod";
import { logger } from "../lib/observability";

const DynamoPlanSchema = z.object({
    planId: z.string(),
    name: z.string(),
    description: z.string().optional().nullable(),
    monthlyPrice: z.number(),
    annualPrice: z.number().optional().nullable(),
    status: z.enum(["active", "inactive"]),
    createdAt: z.union([z.string(), z.number()]).transform(v => String(v)),
    updatedAt: z.union([z.string(), z.number()]).optional().transform(v => v != null ? String(v) : undefined),
}).passthrough();

function parsePlan(data: unknown): Plan {
    const result = DynamoPlanSchema.safeParse(data);
    if (!result.success) {
        logger.error("Data validation failed reading from DynamoDB", { errors: result.error.issues, data });
        throw new Error(`Data integrity error: ${result.error.message}`);
    }
    return result.data as Plan;
}

const DEFAULT_PAGE_SIZE = 20;

export class DynamoPlanRepository implements PlanRepository {
    async create(plan: Plan): Promise<Plan> {
        const { createdAt, updatedAt, ...data } = plan;
        const result = await DBService.entities.plan.create(data).go();
        return parsePlan(result.data);
    }

    async get(planId: string): Promise<Plan | null> {
        const result = await DBService.entities.plan.get({ planId }).go();
        if (!result.data) return null;
        return parsePlan(result.data);
    }

    async list(options?: PaginationOptions): Promise<PaginatedResult<Plan>> {
        const limit = options?.limit || DEFAULT_PAGE_SIZE;
        const result = await DBService.entities.plan.scan.go({
            limit,
            ...(options?.cursor && { cursor: options.cursor }),
        });
        return {
            items: result.data.map(parsePlan),
            cursor: result.cursor ?? null,
        };
    }

    async update(planId: string, data: UpdatePlanRequest): Promise<Plan> {
        const result = await DBService.entities.plan.patch({ planId }).set(data).go({ response: "all_new" });
        return parsePlan(result.data);
    }

    async delete(planId: string): Promise<void> {
        await DBService.entities.plan.delete({ planId }).go();
    }
}
