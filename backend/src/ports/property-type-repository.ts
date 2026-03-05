import { PropertyType, UpdatePropertyTypeRequest } from "../domain/property-type";
import { PaginationOptions, PaginatedResult } from "../domain/shared";

export interface PropertyTypeRepository {
    create(propertyType: PropertyType): Promise<PropertyType>;
    get(organizationId: string, propertyTypeId: string): Promise<PropertyType | null>;
    list(organizationId: string, options?: PaginationOptions): Promise<PaginatedResult<PropertyType>>;
    update(organizationId: string, propertyTypeId: string, data: UpdatePropertyTypeRequest): Promise<PropertyType>;
    delete(organizationId: string, propertyTypeId: string): Promise<void>;
}
