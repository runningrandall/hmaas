import { PaginationOptions, PaginatedResult } from "./shared";

export type PlanStatus = "active" | "inactive";

export interface Plan {
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
    get(planId: string): Promise<Plan | null>;
    list(options?: PaginationOptions): Promise<PaginatedResult<Plan>>;
    update(planId: string, data: UpdatePlanRequest): Promise<Plan>;
    delete(planId: string): Promise<void>;
}
