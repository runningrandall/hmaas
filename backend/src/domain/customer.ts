import { PaginationOptions, PaginatedResult } from "./shared";

export type CustomerStatus = "active" | "inactive" | "suspended";

export interface Customer {
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

export interface CustomerRepository {
    create(customer: Customer): Promise<Customer>;
    get(customerId: string): Promise<Customer | null>;
    list(options?: PaginationOptions): Promise<PaginatedResult<Customer>>;
    update(customerId: string, data: UpdateCustomerRequest): Promise<Customer>;
    delete(customerId: string): Promise<void>;
}
