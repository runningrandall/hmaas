import { apiGet, apiPost, apiPut, apiDelete } from './client';

export type ServiceUnit = 'per_visit' | 'per_hour' | 'per_sqft' | 'per_linear_foot' | 'per_unit' | 'per_window';
export type ServiceFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'biannual' | 'annually' | 'one_time';

export const SERVICE_UNIT_LABELS: Record<ServiceUnit, string> = {
    per_visit: 'Per Visit',
    per_hour: 'Per Hour',
    per_sqft: 'Per Sq Ft',
    per_linear_foot: 'Per Linear Foot',
    per_unit: 'Per Unit',
    per_window: 'Per Window',
};

export const SERVICE_FREQUENCY_LABELS: Record<ServiceFrequency, string> = {
    weekly: 'Weekly',
    biweekly: 'Biweekly',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    biannual: 'Biannual',
    annually: 'Annually',
    one_time: 'One Time',
};

export interface ServiceType {
    organizationId: string;
    serviceTypeId: string;
    name: string;
    description?: string;
    basePrice?: number;
    unit?: ServiceUnit;
    estimatedDuration?: number;
    frequency?: ServiceFrequency;
    measurementKey?: string;
    measurementUnit?: string;
    ratePerUnit?: number;
    durationPerUnit?: number;
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
    measurementKey?: string;
    measurementUnit?: string;
    ratePerUnit?: number;
    durationPerUnit?: number;
}

export interface UpdateServiceTypeData {
    name?: string;
    description?: string;
    basePrice?: number;
    unit?: ServiceUnit;
    estimatedDuration?: number;
    frequency?: ServiceFrequency;
    measurementKey?: string;
    measurementUnit?: string;
    ratePerUnit?: number;
    durationPerUnit?: number;
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
