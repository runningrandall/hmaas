import { Cost } from "../domain/cost";
import { PaginationOptions, PaginatedResult } from "../domain/shared";

export interface CostRepository {
    create(cost: Cost): Promise<Cost>;
    get(organizationId: string, costId: string): Promise<Cost | null>;
    listByServiceId(organizationId: string, serviceId: string, options?: PaginationOptions): Promise<PaginatedResult<Cost>>;
    delete(organizationId: string, costId: string): Promise<void>;
}
