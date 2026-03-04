import { apiGet, apiPost, apiPut, apiDelete } from './client';

export type ServiceUnit = 'per_visit' | 'per_hour' | 'per_sqft';
export type ServiceFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annually' | 'one_time';

export interface ServiceType {
    organizationId: string;
    serviceTypeId: string;
    name: string;
    description?: string;
    basePrice?: number;
    unit?: ServiceUnit;
    estimatedDuration?: number;
    frequency?: ServiceFrequency;
    createdAt: string;
    updatedAt?: string;
}

export interface CreateServiceTypeData {
    name: string;
    description?: string;
    basePrice?: number;
    unit?: ServiceUnit;
    estimatedDuration?: number;
    frequency?: ServiceFrequency;
}

export interface UpdateServiceTypeData {
    name?: string;
    description?: string;
    basePrice?: number;
    unit?: ServiceUnit;
    estimatedDuration?: number;
    frequency?: ServiceFrequency;
}

export interface PaginatedServiceTypes {
    items: ServiceType[];
    cursor?: string | null;
}

export const serviceTypesApi = {
    list: () => apiGet<PaginatedServiceTypes>('service-types'),
    get: (id: string) => apiGet<ServiceType>(`service-types/${id}`),
    create: (data: CreateServiceTypeData) => apiPost<ServiceType>('service-types', data),
    update: (id: string, data: UpdateServiceTypeData) => apiPut<ServiceType>(`service-types/${id}`, data),
    delete: (id: string) => apiDelete(`service-types/${id}`),
};
