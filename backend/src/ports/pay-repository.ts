import { Pay, UpdatePayRequest } from "../domain/pay";
import { PaginationOptions, PaginatedResult } from "../domain/shared";

export interface PayRepository {
    create(pay: Pay): Promise<Pay>;
    get(organizationId: string, payId: string): Promise<Pay | null>;
    listByEmployeeId(organizationId: string, employeeId: string, options?: PaginationOptions): Promise<PaginatedResult<Pay>>;
    update(organizationId: string, payId: string, data: UpdatePayRequest): Promise<Pay>;
    delete(organizationId: string, payId: string): Promise<void>;
}
