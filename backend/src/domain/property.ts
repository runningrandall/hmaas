import { PaginationOptions, PaginatedResult } from "./shared";

export type PropertyStatus = "active" | "inactive";

export interface Property {
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
    get(propertyId: string): Promise<Property | null>;
    listByCustomerId(customerId: string, options?: PaginationOptions): Promise<PaginatedResult<Property>>;
    update(propertyId: string, data: UpdatePropertyRequest): Promise<Property>;
    delete(propertyId: string): Promise<void>;
}
