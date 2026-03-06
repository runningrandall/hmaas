import { Servicer, UpdateServicerRequest } from "../domain/servicer";
import { PaginationOptions, PaginatedResult } from "../domain/shared";

export interface ServicerRepository {
    create(servicer: Servicer): Promise<Servicer>;
    get(organizationId: string, servicerId: string): Promise<Servicer | null>;
    getByEmployeeId(organizationId: string, employeeId: string, options?: PaginationOptions): Promise<PaginatedResult<Servicer>>;
    update(organizationId: string, servicerId: string, data: UpdateServicerRequest): Promise<Servicer>;
    delete(organizationId: string, servicerId: string): Promise<void>;
}
