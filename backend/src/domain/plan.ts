import { PaginationOptions, PaginatedResult } from "./shared";

export type PlanStatus = "active" | "inactive";

export interface Plan {
    organizationId: string;
    planId: string;
    name: string;
    description?: string;
    monthlyPrice: number;
    annualPrice?: number;
    status: PlanStatus;
    createdAt: string;
    updatedAt?: string;
}

export interface CreatePlanRequest {
    name: string;
    description?: string;
    monthlyPrice: number;
    annualPrice?: number;
    status?: PlanStatus;
}

export interface UpdatePlanRequest {
    name?: string;
    description?: string;
    monthlyPrice?: number;
    annualPrice?: number;
    status?: PlanStatus;
}

export interface PlanRepository {
    create(plan: Plan): Promise<Plan>;
    get(organizationId: string, planId: string): Promise<Plan | null>;
    list(organizationId: string, options?: PaginationOptions): Promise<PaginatedResult<Plan>>;
    update(organizationId: string, planId: string, data: UpdatePlanRequest): Promise<Plan>;
    delete(organizationId: string, planId: string): Promise<void>;
}
