import { PlanService } from "../domain/plan-service";
import { PaginationOptions, PaginatedResult } from "../domain/shared";

export interface PlanServiceRepository {
    create(planService: PlanService): Promise<PlanService>;
    get(organizationId: string, planId: string, serviceTypeId: string): Promise<PlanService | null>;
    listByPlanId(organizationId: string, planId: string, options?: PaginationOptions): Promise<PaginatedResult<PlanService>>;
    delete(organizationId: string, planId: string, serviceTypeId: string): Promise<void>;
}
