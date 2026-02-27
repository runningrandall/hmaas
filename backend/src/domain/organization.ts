import { PaginationOptions, PaginatedResult } from "./shared";

export type OrganizationStatus = "active" | "inactive" | "suspended";

export interface OrganizationConfig {
    googleMapsApiKey?: string;
    defaultPlanId?: string;
    invoiceDayOfMonth?: number;
    brandColor?: string;
    logoUrl?: string;
}

export interface Organization {
    organizationId: string;
    name: string;
    slug: string;
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
    secretsArn?: string;
    createdAt: string;
    updatedAt?: string;
}

export interface CreateOrganizationRequest {
    name: string;
    slug: string;
    ownerUserId: string;
    billingEmail: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    timezone?: string;
}

export interface UpdateOrganizationRequest {
    name?: string;
    slug?: string;
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

export interface OrganizationRepository {
    create(organization: Organization): Promise<Organization>;
    get(organizationId: string): Promise<Organization | null>;
    getBySlug(slug: string): Promise<Organization | null>;
    list(options?: PaginationOptions): Promise<PaginatedResult<Organization>>;
    listByStatus(status: OrganizationStatus, options?: PaginationOptions): Promise<PaginatedResult<Organization>>;
    update(organizationId: string, data: UpdateOrganizationRequest): Promise<Organization>;
    updateConfig(organizationId: string, config: OrganizationConfig): Promise<Organization>;
    delete(organizationId: string): Promise<void>;
}

export interface OrganizationSecretsManager {
    getSecrets(organizationId: string): Promise<Record<string, string>>;
    getSecret(organizationId: string, key: string): Promise<string | null>;
    setSecret(organizationId: string, key: string, value: string): Promise<void>;
    deleteSecret(organizationId: string, key: string): Promise<void>;
}
