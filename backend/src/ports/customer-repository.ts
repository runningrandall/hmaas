import { Customer, UpdateCustomerRequest } from "../domain/customer";
import { PaginationOptions, PaginatedResult } from "../domain/shared";

export interface CustomerSearchOptions extends PaginationOptions {
    search?: string;
}

export interface CustomerRepository {
    create(customer: Customer): Promise<Customer>;
    get(organizationId: string, customerId: string): Promise<Customer | null>;
    list(organizationId: string, options?: CustomerSearchOptions): Promise<PaginatedResult<Customer>>;
    update(organizationId: string, customerId: string, data: UpdateCustomerRequest): Promise<Customer>;
    delete(organizationId: string, customerId: string): Promise<void>;
}
