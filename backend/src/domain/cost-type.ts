import { PaginationOptions, PaginatedResult } from "./shared";

export interface CostType {
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
    get(costTypeId: string): Promise<CostType | null>;
    list(options?: PaginationOptions): Promise<PaginatedResult<CostType>>;
    update(costTypeId: string, data: UpdateCostTypeRequest): Promise<CostType>;
    delete(costTypeId: string): Promise<void>;
}
