import { PaginationOptions, PaginatedResult } from "./shared";

export interface ServiceType {
    organizationId: string;
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
    get(organizationId: string, serviceTypeId: string): Promise<ServiceType | null>;
    list(organizationId: string, options?: PaginationOptions): Promise<PaginatedResult<ServiceType>>;
    update(organizationId: string, serviceTypeId: string, data: UpdateServiceTypeRequest): Promise<ServiceType>;
    delete(organizationId: string, serviceTypeId: string): Promise<void>;
}
