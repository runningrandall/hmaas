import { Plan, UpdatePlanRequest } from "../domain/plan";
import { PaginationOptions, PaginatedResult } from "../domain/shared";

export interface PlanRepository {
    create(plan: Plan): Promise<Plan>;
    get(organizationId: string, planId: string): Promise<Plan | null>;
    list(organizationId: string, options?: PaginationOptions): Promise<PaginatedResult<Plan>>;
    update(organizationId: string, planId: string, data: UpdatePlanRequest): Promise<Plan>;
    delete(organizationId: string, planId: string): Promise<void>;
}
