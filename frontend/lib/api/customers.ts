import { apiGet, apiPost, apiPut, apiDelete } from './client';

export interface Customer {
    customerId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    status: string;
    notes?: string;
    createdAt: string;
}

export interface Account {
    accountId: string;
    customerId: string;
    cognitoUserId?: string;
    planId?: string;
    status: string;
    billingEmail?: string;
    createdAt: string;
}

export interface PaginatedResult<T> {
    items: T[];
    cursor?: string | null;
}

export const customersApi = {
    list: (search?: string) => apiGet<PaginatedResult<Customer>>(`customers${search ? `?search=${encodeURIComponent(search)}` : ''}`),
    get: (id: string) => apiGet<Customer>(`customers/${id}`),
    create: (data: { firstName: string; lastName: string; email: string; phone?: string; notes?: string }) =>
        apiPost<{ customer: Customer; account: Account }>('customers', data),
    update: (id: string, data: Partial<Customer>) => apiPut<Customer>(`customers/${id}`, data),
    delete: (id: string) => apiDelete(`customers/${id}`),
    getAccount: (id: string) => apiGet<Account>(`customers/${id}/account`),
};
