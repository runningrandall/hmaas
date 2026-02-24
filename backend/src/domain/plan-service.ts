import { PaginationOptions, PaginatedResult } from "./shared";

export interface PlanService {
    planId: string;
    serviceTypeId: string;
    includedVisits?: number;
    frequency?: string;
    createdAt: string;
    updatedAt?: string;
}

export interface CreatePlanServiceRequest {
    planId: string;
    serviceTypeId: string;
    includedVisits?: number;
    frequency?: string;
}

export interface PlanServiceRepository {
    create(planService: PlanService): Promise<PlanService>;
    get(planId: string, serviceTypeId: string): Promise<PlanService | null>;
    listByPlanId(planId: string, options?: PaginationOptions): Promise<PaginatedResult<PlanService>>;
    delete(planId: string, serviceTypeId: string): Promise<void>;
}
