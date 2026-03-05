export interface Cost {
    organizationId: string;
    costId: string;
    serviceId: string;
    costTypeId: string;
    amount: number;
    description?: string;
    effectiveDate?: string;
    createdAt: string;
    updatedAt?: string;
}

export interface CreateCostRequest {
    serviceId: string;
    costTypeId: string;
    amount: number;
    description?: string;
    effectiveDate?: string;
}
