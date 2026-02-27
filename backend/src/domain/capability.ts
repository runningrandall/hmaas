import { PaginationOptions, PaginatedResult } from "./shared";

export type CapabilityLevel = "beginner" | "intermediate" | "expert";

export interface Capability {
    organizationId: string;
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
    get(organizationId: string, capabilityId: string): Promise<Capability | null>;
    listByEmployeeId(organizationId: string, employeeId: string, options?: PaginationOptions): Promise<PaginatedResult<Capability>>;
    delete(organizationId: string, capabilityId: string): Promise<void>;
}
