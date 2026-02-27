import { PaginationOptions, PaginatedResult } from "./shared";

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

export interface CostTypeRepository {
    create(costType: CostType): Promise<CostType>;
    get(organizationId: string, costTypeId: string): Promise<CostType | null>;
    list(organizationId: string, options?: PaginationOptions): Promise<PaginatedResult<CostType>>;
    update(organizationId: string, costTypeId: string, data: UpdateCostTypeRequest): Promise<CostType>;
    delete(organizationId: string, costTypeId: string): Promise<void>;
}
