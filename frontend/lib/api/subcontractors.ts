import { apiGet, apiPost, apiPut, apiDelete } from './client';

export type SubcontractorStatus = 'active' | 'inactive';

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

export interface CreateSubcontractorData {
    name: string;
    contactName?: string;
    email: string;
    phone?: string;
    notes?: string;
}

export interface UpdateSubcontractorData {
    name?: string;
    contactName?: string;
    email?: string;
    phone?: string;
    status?: SubcontractorStatus;
    notes?: string;
}

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

export interface CreateSubcontractorRateData {
    propertyId: string;
    serviceTypeId: string;
    rate: number;
    unit: string;
    effectiveDate?: string;
    notes?: string;
}

export interface UpdateSubcontractorRateData {
    rate?: number;
    unit?: string;
    effectiveDate?: string;
    notes?: string;
}

export interface PaginatedSubcontractors {
    items: Subcontractor[];
    cursor?: string | null;
}

export interface PaginatedSubcontractorRates {
    items: SubcontractorRate[];
    cursor?: string | null;
}

export const subcontractorsApi = {
    list: () => apiGet<PaginatedSubcontractors>('subcontractors'),
    get: (id: string) => apiGet<Subcontractor>(`subcontractors/${id}`),
    create: (data: CreateSubcontractorData) => apiPost<Subcontractor>('subcontractors', data),
    update: (id: string, data: UpdateSubcontractorData) => apiPut<Subcontractor>(`subcontractors/${id}`, data),
    delete: (id: string) => apiDelete(`subcontractors/${id}`),

    // Rates
    listRates: (subcontractorId: string) =>
        apiGet<PaginatedSubcontractorRates>(`subcontractors/${subcontractorId}/rates`),
    createRate: (subcontractorId: string, data: CreateSubcontractorRateData) =>
        apiPost<SubcontractorRate>(`subcontractors/${subcontractorId}/rates`, data),
    getRate: (rateId: string) => apiGet<SubcontractorRate>(`subcontractor-rates/${rateId}`),
    updateRate: (rateId: string, data: UpdateSubcontractorRateData) =>
        apiPut<SubcontractorRate>(`subcontractor-rates/${rateId}`, data),
    deleteRate: (rateId: string) => apiDelete(`subcontractor-rates/${rateId}`),
};
