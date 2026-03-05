export interface CostType {
    organizationId: string;
    costTypeId: string;
    name: string;
    description?: string;
    createdAt: string;
    updatedAt?: string;
}

export interface CreateCostTypeRequest {
    name: string;
    description?: string;
}

export interface UpdateCostTypeRequest {
    name?: string;
    description?: string;
}
