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
