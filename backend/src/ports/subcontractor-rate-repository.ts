import { SubcontractorRate, UpdateSubcontractorRateRequest } from "../domain/subcontractor-rate";
import { PaginationOptions, PaginatedResult } from "../domain/shared";

export interface SubcontractorRateRepository {
    create(rate: SubcontractorRate): Promise<SubcontractorRate>;
    get(organizationId: string, subcontractorRateId: string): Promise<SubcontractorRate | null>;
    listBySubcontractorId(organizationId: string, subcontractorId: string, options?: PaginationOptions): Promise<PaginatedResult<SubcontractorRate>>;
    update(organizationId: string, subcontractorRateId: string, data: UpdateSubcontractorRateRequest): Promise<SubcontractorRate>;
    delete(organizationId: string, subcontractorRateId: string): Promise<void>;
}
