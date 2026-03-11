export interface SubcontractorRate {
    organizationId: string;
    subcontractorRateId: string;
    subcontractorId: string;
    propertyId: string;
    serviceTypeId: string;
    rate: number;
    unit: string;
    effectiveDate?: string;
    notes?: string;
    createdAt: string;
    updatedAt?: string;
}

export interface CreateSubcontractorRateRequest {
    propertyId: string;
    serviceTypeId: string;
    rate: number;
    unit: string;
    effectiveDate?: string;
    notes?: string;
}

export interface UpdateSubcontractorRateRequest {
    rate?: number;
    unit?: string;
    effectiveDate?: string;
    notes?: string;
}
