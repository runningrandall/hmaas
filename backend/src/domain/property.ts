import { PaginationOptions, PaginatedResult } from "./shared";

export type PropertyStatus = "active" | "inactive";

export interface Property {
    organizationId: string;
    propertyId: string;
    customerId: string;
    propertyTypeId: string;
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    lat?: number;
    lng?: number;
    lotSize?: number;
    notes?: string;
    status: PropertyStatus;
    createdAt: string;
    updatedAt?: string;
}

export interface CreatePropertyRequest {
    customerId: string;
    propertyTypeId: string;
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    lat?: number;
    lng?: number;
    lotSize?: number;
    notes?: string;
}

export interface UpdatePropertyRequest {
    propertyTypeId?: string;
    name?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    lat?: number;
    lng?: number;
    lotSize?: number;
    notes?: string;
    status?: PropertyStatus;
}

export interface PropertyRepository {
    create(property: Property): Promise<Property>;
    get(organizationId: string, propertyId: string): Promise<Property | null>;
    listByCustomerId(organizationId: string, customerId: string, options?: PaginationOptions): Promise<PaginatedResult<Property>>;
    update(organizationId: string, propertyId: string, data: UpdatePropertyRequest): Promise<Property>;
    delete(organizationId: string, propertyId: string): Promise<void>;
}
