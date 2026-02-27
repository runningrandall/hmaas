import { PaginationOptions, PaginatedResult } from "./shared";

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

export interface CostRepository {
    create(cost: Cost): Promise<Cost>;
    get(organizationId: string, costId: string): Promise<Cost | null>;
    listByServiceId(organizationId: string, serviceId: string, options?: PaginationOptions): Promise<PaginatedResult<Cost>>;
    delete(organizationId: string, costId: string): Promise<void>;
}
