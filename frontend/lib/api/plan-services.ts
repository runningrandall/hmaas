import { apiGet, apiPost, apiDelete } from './client';

export interface PlanService {
    planId: string;
    serviceTypeId: string;
    includedVisits?: number;
    frequency?: string;
    createdAt: string;
    updatedAt?: string;
}

export interface CreatePlanServiceData {
    serviceTypeId: string;
    includedVisits?: number;
    frequency?: string;
}

export interface PaginatedPlanServices {
    items: PlanService[];
    cursor?: string | null;
}

export const planServicesApi = {
    list: (planId: string) => apiGet<PaginatedPlanServices>(`plans/${planId}/services`),
    create: (planId: string, data: CreatePlanServiceData) => apiPost<PlanService>(`plans/${planId}/services`, data),
    delete: (planId: string, serviceTypeId: string) => apiDelete(`plans/${planId}/services/${serviceTypeId}`),
};
