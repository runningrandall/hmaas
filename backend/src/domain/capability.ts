import { PaginationOptions, PaginatedResult } from "./shared";

export type CapabilityLevel = "beginner" | "intermediate" | "expert";

export interface Capability {
    capabilityId: string;
    employeeId: string;
    serviceTypeId: string;
    level: CapabilityLevel;
    certificationDate?: string;
    createdAt: string;
    updatedAt?: string;
}

export interface CreateCapabilityRequest {
    employeeId: string;
    serviceTypeId: string;
    level: CapabilityLevel;
    certificationDate?: string;
}

export interface CapabilityRepository {
    create(capability: Capability): Promise<Capability>;
    get(capabilityId: string): Promise<Capability | null>;
    listByEmployeeId(employeeId: string, options?: PaginationOptions): Promise<PaginatedResult<Capability>>;
    delete(capabilityId: string): Promise<void>;
}
