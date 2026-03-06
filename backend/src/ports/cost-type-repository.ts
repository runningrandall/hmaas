import { CostType, UpdateCostTypeRequest } from "../domain/cost-type";
import { PaginationOptions, PaginatedResult } from "../domain/shared";

export interface CostTypeRepository {
    create(costType: CostType): Promise<CostType>;
    get(organizationId: string, costTypeId: string): Promise<CostType | null>;
    list(organizationId: string, options?: PaginationOptions): Promise<PaginatedResult<CostType>>;
    update(organizationId: string, costTypeId: string, data: UpdateCostTypeRequest): Promise<CostType>;
    delete(organizationId: string, costTypeId: string): Promise<void>;
}
