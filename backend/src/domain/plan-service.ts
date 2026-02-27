import { PaginationOptions, PaginatedResult } from "./shared";

export interface PlanService {
    organizationId: string;
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
    get(organizationId: string, planId: string, serviceTypeId: string): Promise<PlanService | null>;
    listByPlanId(organizationId: string, planId: string, options?: PaginationOptions): Promise<PaginatedResult<PlanService>>;
    delete(organizationId: string, planId: string, serviceTypeId: string): Promise<void>;
}
