import { ServiceType, UpdateServiceTypeRequest } from "../domain/service-type";
import { PaginationOptions, PaginatedResult } from "../domain/shared";

export interface ServiceTypeRepository {
    create(serviceType: ServiceType): Promise<ServiceType>;
    get(organizationId: string, serviceTypeId: string): Promise<ServiceType | null>;
    list(organizationId: string, options?: PaginationOptions): Promise<PaginatedResult<ServiceType>>;
    update(organizationId: string, serviceTypeId: string, data: UpdateServiceTypeRequest): Promise<ServiceType>;
    delete(organizationId: string, serviceTypeId: string): Promise<void>;
}
