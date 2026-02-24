import { PaginationOptions, PaginatedResult } from "./shared";

export interface ServiceType {
    serviceTypeId: string;
    name: string;
    description?: string;
    category?: string;
    createdAt: string;
    updatedAt?: string;
}

export interface CreateServiceTypeRequest {
    name: string;
    description?: string;
    category?: string;
}

export interface UpdateServiceTypeRequest {
    name?: string;
    description?: string;
    category?: string;
}

export interface ServiceTypeRepository {
    create(serviceType: ServiceType): Promise<ServiceType>;
    get(serviceTypeId: string): Promise<ServiceType | null>;
    list(options?: PaginationOptions): Promise<PaginatedResult<ServiceType>>;
    update(serviceTypeId: string, data: UpdateServiceTypeRequest): Promise<ServiceType>;
    delete(serviceTypeId: string): Promise<void>;
}
