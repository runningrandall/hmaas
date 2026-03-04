import { apiGet, apiPost, apiPut, apiDelete } from './client';

export interface ServiceType {
    organizationId: string;
    serviceTypeId: string;
    name: string;
    description?: string;
    createdAt: string;
    updatedAt?: string;
}

export interface CreateServiceTypeData {
    name: string;
    description?: string;
}

export interface UpdateServiceTypeData {
    name?: string;
    description?: string;
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
