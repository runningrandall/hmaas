import { apiGet, apiPost, apiPut, apiDelete } from './client';

export type PropertyTypeStatus = 'active' | 'inactive';

export interface PropertyType {
    organizationId: string;
    propertyTypeId: string;
    name: string;
    description?: string;
    status: PropertyTypeStatus;
    createdAt: string;
    updatedAt?: string;
}

export interface CreatePropertyTypeData {
    name: string;
    description?: string;
    status?: PropertyTypeStatus;
}

export interface UpdatePropertyTypeData {
    name?: string;
    description?: string;
    status?: PropertyTypeStatus;
}

export interface PaginatedPropertyTypes {
    items: PropertyType[];
    cursor?: string | null;
}

export const propertyTypesApi = {
    list: () => apiGet<PaginatedPropertyTypes>('property-types'),
    get: (id: string) => apiGet<PropertyType>(`property-types/${id}`),
    create: (data: CreatePropertyTypeData) => apiPost<PropertyType>('property-types', data),
    update: (id: string, data: UpdatePropertyTypeData) => apiPut<PropertyType>(`property-types/${id}`, data),
    delete: (id: string) => apiDelete(`property-types/${id}`),
};
