import { Estimate, UpdateEstimateRequest } from "../domain/estimate";
import { PaginationOptions, PaginatedResult } from "../domain/shared";

export interface EstimateRepository {
    create(estimate: Estimate): Promise<Estimate>;
    get(organizationId: string, estimateId: string): Promise<Estimate | null>;
    listByCustomerId(organizationId: string, customerId: string, options?: PaginationOptions): Promise<PaginatedResult<Estimate>>;
    update(organizationId: string, estimateId: string, data: UpdateEstimateRequest & { acceptedAt?: string; invoiceId?: string; status?: string }): Promise<Estimate>;
    delete(organizationId: string, estimateId: string): Promise<void>;
}
