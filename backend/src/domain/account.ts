import { PaginationOptions, PaginatedResult } from "./shared";

export type AccountStatus = "active" | "inactive" | "suspended";

export interface Account {
    organizationId: string;
    accountId: string;
    customerId: string;
    cognitoUserId?: string;
    planId?: string;
    status: AccountStatus;
    billingEmail?: string;
    createdAt: string;
    updatedAt?: string;
}

export interface CreateAccountRequest {
    customerId: string;
    cognitoUserId?: string;
    planId?: string;
    billingEmail?: string;
}

export interface UpdateAccountRequest {
    cognitoUserId?: string;
    planId?: string;
    status?: AccountStatus;
    billingEmail?: string;
}

export interface AccountRepository {
    create(account: Account): Promise<Account>;
    get(organizationId: string, accountId: string): Promise<Account | null>;
    getByCustomerId(organizationId: string, customerId: string): Promise<Account | null>;
    update(organizationId: string, accountId: string, data: UpdateAccountRequest): Promise<Account>;
    delete(organizationId: string, accountId: string): Promise<void>;
}
