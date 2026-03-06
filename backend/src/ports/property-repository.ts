import { Property, UpdatePropertyRequest } from "../domain/property";
import { PaginationOptions, PaginatedResult } from "../domain/shared";

export interface PropertyRepository {
    create(property: Property): Promise<Property>;
    get(organizationId: string, propertyId: string): Promise<Property | null>;
    listByCustomerId(organizationId: string, customerId: string, options?: PaginationOptions): Promise<PaginatedResult<Property>>;
    update(organizationId: string, propertyId: string, data: UpdatePropertyRequest): Promise<Property>;
    delete(organizationId: string, propertyId: string): Promise<void>;
}
