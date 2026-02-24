import { PaginationOptions, PaginatedResult } from "./shared";

export interface Cost {
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

export interface CostRepository {
    create(cost: Cost): Promise<Cost>;
    get(costId: string): Promise<Cost | null>;
    listByServiceId(serviceId: string, options?: PaginationOptions): Promise<PaginatedResult<Cost>>;
    delete(costId: string): Promise<void>;
}
