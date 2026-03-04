import { PaginationOptions, PaginatedResult } from "./shared";

export type ServiceUnit = "per_visit" | "per_hour" | "per_sqft";
export type ServiceFrequency = "weekly" | "biweekly" | "monthly" | "quarterly" | "annually" | "one_time";

export interface ServiceType {
    organizationId: string;
    serviceTypeId: string;
    name: string;
    description?: string;
    basePrice?: number;
    unit?: ServiceUnit;
    estimatedDuration?: number;
    frequency?: ServiceFrequency;
    createdAt: string;
    updatedAt?: string;
}

export interface CreateServiceTypeRequest {
    name: string;
    description?: string;
    basePrice?: number;
    unit?: ServiceUnit;
    estimatedDuration?: number;
    frequency?: ServiceFrequency;
}

export interface UpdateServiceTypeRequest {
    name?: string;
    description?: string;
    basePrice?: number;
    unit?: ServiceUnit;
    estimatedDuration?: number;
    frequency?: ServiceFrequency;
}

export interface ServiceTypeRepository {
    create(serviceType: ServiceType): Promise<ServiceType>;
    get(organizationId: string, serviceTypeId: string): Promise<ServiceType | null>;
    list(organizationId: string, options?: PaginationOptions): Promise<PaginatedResult<ServiceType>>;
    update(organizationId: string, serviceTypeId: string, data: UpdateServiceTypeRequest): Promise<ServiceType>;
    delete(organizationId: string, serviceTypeId: string): Promise<void>;
}
