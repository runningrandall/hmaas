import { PaginationOptions, PaginatedResult } from "./shared";

export type PropertyServiceStatus = "active" | "inactive" | "cancelled";

export interface PropertyService {
    serviceId: string;
    propertyId: string;
    serviceTypeId: string;
    planId?: string;
    status: PropertyServiceStatus;
    startDate?: string;
    endDate?: string;
    frequency?: string;
    createdAt: string;
    updatedAt?: string;
}

export interface CreatePropertyServiceRequest {
    propertyId: string;
    serviceTypeId: string;
    planId?: string;
    startDate?: string;
    endDate?: string;
    frequency?: string;
}

export interface UpdatePropertyServiceRequest {
    status?: PropertyServiceStatus;
    planId?: string;
    startDate?: string;
    endDate?: string;
    frequency?: string;
}

export interface PropertyServiceRepository {
    create(propertyService: PropertyService): Promise<PropertyService>;
    get(serviceId: string): Promise<PropertyService | null>;
    listByPropertyId(propertyId: string, options?: PaginationOptions): Promise<PaginatedResult<PropertyService>>;
    update(serviceId: string, data: UpdatePropertyServiceRequest): Promise<PropertyService>;
    delete(serviceId: string): Promise<void>;
}
