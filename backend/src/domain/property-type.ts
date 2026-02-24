import { PaginationOptions, PaginatedResult } from "./shared";

export interface PropertyType {
    propertyTypeId: string;
    name: string;
    description?: string;
    createdAt: string;
    updatedAt?: string;
}

export interface CreatePropertyTypeRequest {
    name: string;
    description?: string;
}

export interface UpdatePropertyTypeRequest {
    name?: string;
    description?: string;
}

export interface PropertyTypeRepository {
    create(propertyType: PropertyType): Promise<PropertyType>;
    get(propertyTypeId: string): Promise<PropertyType | null>;
    list(options?: PaginationOptions): Promise<PaginatedResult<PropertyType>>;
    update(propertyTypeId: string, data: UpdatePropertyTypeRequest): Promise<PropertyType>;
    delete(propertyTypeId: string): Promise<void>;
}
