export type CustomerStatus = "active" | "inactive" | "suspended";

export interface Customer {
    organizationId: string;
    customerId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    status: CustomerStatus;
    notes?: string;
    createdAt: string;
    updatedAt?: string;
}

export interface CreateCustomerRequest {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    notes?: string;
}

export interface UpdateCustomerRequest {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    status?: CustomerStatus;
    notes?: string;
}
