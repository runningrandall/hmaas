import { PropertyService, UpdatePropertyServiceRequest } from "../domain/property-service";
import { PaginationOptions, PaginatedResult } from "../domain/shared";

export interface PropertyServiceRepository {
    create(propertyService: PropertyService): Promise<PropertyService>;
    get(organizationId: string, serviceId: string): Promise<PropertyService | null>;
    listByPropertyId(organizationId: string, propertyId: string, options?: PaginationOptions): Promise<PaginatedResult<PropertyService>>;
    update(organizationId: string, serviceId: string, data: UpdatePropertyServiceRequest): Promise<PropertyService>;
    delete(organizationId: string, serviceId: string): Promise<void>;
}
