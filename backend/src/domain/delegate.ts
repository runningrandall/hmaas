import { PaginationOptions, PaginatedResult } from "./shared";

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

export interface DelegateRepository {
    create(delegate: Delegate): Promise<Delegate>;
    get(organizationId: string, delegateId: string): Promise<Delegate | null>;
    listByAccountId(organizationId: string, accountId: string, options?: PaginationOptions): Promise<PaginatedResult<Delegate>>;
    delete(organizationId: string, delegateId: string): Promise<void>;
}
