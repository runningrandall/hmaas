export type PropertyTypeStatus = "active" | "inactive";

export interface PropertyType {
    organizationId: string;
    propertyTypeId: string;
    name: string;
    description?: string;
    status: PropertyTypeStatus;
    createdAt: string;
    updatedAt?: string;
}

export interface CreatePropertyTypeRequest {
    name: string;
    description?: string;
    status?: PropertyTypeStatus;
}

export interface UpdatePropertyTypeRequest {
    name?: string;
    description?: string;
    status?: PropertyTypeStatus;
}
