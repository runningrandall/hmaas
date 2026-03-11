import { Subcontractor, UpdateSubcontractorRequest } from "../domain/subcontractor";
import { PaginationOptions, PaginatedResult } from "../domain/shared";

export interface SubcontractorRepository {
    create(subcontractor: Subcontractor): Promise<Subcontractor>;
    get(organizationId: string, subcontractorId: string): Promise<Subcontractor | null>;
    list(organizationId: string, options?: PaginationOptions): Promise<PaginatedResult<Subcontractor>>;
    update(organizationId: string, subcontractorId: string, data: UpdateSubcontractorRequest): Promise<Subcontractor>;
    delete(organizationId: string, subcontractorId: string): Promise<void>;
}
