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
    secretsArn?: string;
    createdAt: string;
    updatedAt?: string;
}

export interface CreateOrganizationRequest {
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

export interface UpdateOrganizationRequest {
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


export interface CognitoUser {
    userId: string;
    email?: string;
    name?: string;
    groups: string[];
}
