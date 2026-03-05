import { Capability } from "../domain/capability";
import { PaginationOptions, PaginatedResult } from "../domain/shared";

export interface CapabilityRepository {
    create(capability: Capability): Promise<Capability>;
    get(organizationId: string, capabilityId: string): Promise<Capability | null>;
    listByEmployeeId(organizationId: string, employeeId: string, options?: PaginationOptions): Promise<PaginatedResult<Capability>>;
    delete(organizationId: string, capabilityId: string): Promise<void>;
}
