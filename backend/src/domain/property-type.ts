import { PaginationOptions, PaginatedResult } from "./shared";

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

export interface PropertyTypeRepository {
    create(propertyType: PropertyType): Promise<PropertyType>;
    get(organizationId: string, propertyTypeId: string): Promise<PropertyType | null>;
    list(organizationId: string, options?: PaginationOptions): Promise<PaginatedResult<PropertyType>>;
    update(organizationId: string, propertyTypeId: string, data: UpdatePropertyTypeRequest): Promise<PropertyType>;
    delete(organizationId: string, propertyTypeId: string): Promise<void>;
}
