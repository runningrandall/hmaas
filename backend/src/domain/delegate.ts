export type DelegateStatus = "active" | "inactive";

export interface Delegate {
    organizationId: string;
    delegateId: string;
    accountId: string;
    email: string;
    name: string;
    permissions?: string[];
    status: DelegateStatus;
    createdAt: string;
    updatedAt?: string;
}

export interface CreateDelegateRequest {
    accountId: string;
    email: string;
    name: string;
    permissions?: string[];
}
