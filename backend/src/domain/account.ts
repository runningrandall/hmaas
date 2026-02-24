import { PaginationOptions, PaginatedResult } from "./shared";

export type AccountStatus = "active" | "inactive" | "suspended";

export interface Account {
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
    get(accountId: string): Promise<Account | null>;
    getByCustomerId(customerId: string): Promise<Account | null>;
    update(accountId: string, data: UpdateAccountRequest): Promise<Account>;
    delete(accountId: string): Promise<void>;
}
