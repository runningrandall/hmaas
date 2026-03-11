export type SubcontractorStatus = "active" | "inactive";

export interface Subcontractor {
    organizationId: string;
    subcontractorId: string;
    name: string;
    contactName?: string;
    email: string;
    phone?: string;
    status: SubcontractorStatus;
    notes?: string;
    createdAt: string;
    updatedAt?: string;
}

export interface CreateSubcontractorRequest {
    name: string;
    contactName?: string;
    email: string;
    phone?: string;
    notes?: string;
}

export interface UpdateSubcontractorRequest {
    name?: string;
    contactName?: string;
    email?: string;
    phone?: string;
    status?: SubcontractorStatus;
    notes?: string;
}
