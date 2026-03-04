import { apiGet, apiPost, apiPut, apiDelete } from './client';

export type OrganizationStatus = 'active' | 'inactive' | 'suspended';

export interface OrganizationConfig {
    googleMapsApiKey?: string;
    defaultPlanId?: string;
    invoiceDayOfMonth?: number;
    brandColor?: string;
    logoUrl?: string;
}

export interface CognitoUser {
    userId: string;
    email?: string;
    name?: string;
    groups: string[];
}

export interface Organization {
    organizationId: string;
    name: string;
    slug: string;
    description?: string;
    status: OrganizationStatus;
    ownerUserId: string;
    billingEmail: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    timezone?: string;
    config?: OrganizationConfig;
    createdAt: string;
    updatedAt?: string;
}

export interface CreateOrganizationData {
    name: string;
    slug: string;
    description?: string;
    ownerUserId: string;
    billingEmail: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    timezone?: string;
}

export interface UpdateOrganizationData {
    name?: string;
    slug?: string;
    description?: string;
    status?: OrganizationStatus;
    ownerUserId?: string;
    billingEmail?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    timezone?: string;
}

export interface PaginatedOrganizations {
    items: Organization[];
    cursor?: string | null;
}

export const organizationsApi = {
    list: () => apiGet<PaginatedOrganizations>('organizations'),
    get: (id: string) => apiGet<Organization>(`organizations/${id}`),
    create: (data: CreateOrganizationData) => apiPost<Organization>('organizations', data),
    update: (id: string, data: UpdateOrganizationData) => apiPut<Organization>(`organizations/${id}`, data),
    delete: (id: string) => apiDelete(`organizations/${id}`),
    listAdminUsers: () => apiGet<CognitoUser[]>('admin-users'),
    getConfig: (id: string) => apiGet<OrganizationConfig>(`organizations/${id}/config`),
    updateConfig: (id: string, config: Partial<OrganizationConfig>) =>
        apiPut<OrganizationConfig>(`organizations/${id}/config`, config),
};
