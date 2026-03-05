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
