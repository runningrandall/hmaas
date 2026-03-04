import { apiGet, apiPost, apiPut, apiDelete } from './client';

export type PlanStatus = 'active' | 'inactive';

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

export interface CreatePlanData {
    name: string;
    description?: string;
    monthlyPrice: number;
    annualPrice?: number;
    status?: PlanStatus;
}

export interface UpdatePlanData {
    name?: string;
    description?: string;
    monthlyPrice?: number;
    annualPrice?: number;
    status?: PlanStatus;
}

export interface PaginatedPlans {
    items: Plan[];
    cursor?: string | null;
}

export const plansApi = {
    list: () => apiGet<PaginatedPlans>('plans'),
    get: (id: string) => apiGet<Plan>(`plans/${id}`),
    create: (data: CreatePlanData) => apiPost<Plan>('plans', data),
    update: (id: string, data: UpdatePlanData) => apiPut<Plan>(`plans/${id}`, data),
    delete: (id: string) => apiDelete(`plans/${id}`),
};
