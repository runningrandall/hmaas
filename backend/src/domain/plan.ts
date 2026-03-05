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
