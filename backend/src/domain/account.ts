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
