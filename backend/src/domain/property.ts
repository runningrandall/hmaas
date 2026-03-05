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
