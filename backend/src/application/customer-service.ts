import { Customer, CreateCustomerRequest, UpdateCustomerRequest, CustomerRepository } from "../domain/customer";
import { AccountRepository } from "../domain/account";
import { Account } from "../domain/account";
import { EventPublisher, PaginationOptions, PaginatedResult } from "../domain/shared";
import { randomUUID } from "crypto";
import { logger, metrics } from "../lib/observability";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { AppError } from "../lib/error";

export class CustomerService {
    constructor(
        private customerRepository: CustomerRepository,
        private accountRepository: AccountRepository,
        private eventPublisher: EventPublisher
    ) {}

    async createCustomer(organizationId: string, request: CreateCustomerRequest): Promise<{ customer: Customer; account: Account }> {
        logger.info("Creating customer", { email: request.email });

        const customerId = randomUUID();
        const accountId = randomUUID();

        const customer: Customer = {
            organizationId,
            customerId,
            firstName: request.firstName,
            lastName: request.lastName,
            email: request.email,
            phone: request.phone,
            status: "active",
            notes: request.notes,
            createdAt: new Date().toISOString(),
        };

        const account: Account = {
            organizationId,
            accountId,
            customerId,
            status: "active",
            billingEmail: request.email,
            createdAt: new Date().toISOString(),
        };

        const createdCustomer = await this.customerRepository.create(customer);
        const createdAccount = await this.accountRepository.create(account);

        metrics.addMetric('CustomersCreated', MetricUnit.Count, 1);
        await this.eventPublisher.publish("CustomerCreated", { organizationId, customerId, accountId });

        return { customer: createdCustomer, account: createdAccount };
    }

    async getCustomer(organizationId: string, customerId: string): Promise<Customer> {
        const customer = await this.customerRepository.get(organizationId, customerId);
        if (!customer) {
            throw new AppError("Customer not found", 404);
        }
        return customer;
    }

    async listCustomers(organizationId: string, options?: PaginationOptions): Promise<PaginatedResult<Customer>> {
        return this.customerRepository.list(organizationId, options);
    }

    async updateCustomer(organizationId: string, customerId: string, request: UpdateCustomerRequest): Promise<Customer> {
        const existing = await this.getCustomer(organizationId, customerId);
        const updated = await this.customerRepository.update(organizationId, customerId, request);

        if (request.status && request.status !== existing.status) {
            await this.eventPublisher.publish("CustomerStatusChanged", {
                organizationId,
                customerId,
                previousStatus: existing.status,
                newStatus: request.status,
            });
        }

        return updated;
    }

    async deleteCustomer(organizationId: string, customerId: string): Promise<void> {
        await this.customerRepository.delete(organizationId, customerId);
        logger.info("Customer deleted", { customerId });
    }

    async getCustomerAccount(organizationId: string, customerId: string): Promise<Account> {
        await this.getCustomer(organizationId, customerId);
        const account = await this.accountRepository.getByCustomerId(organizationId, customerId);
        if (!account) {
            throw new AppError("Account not found for customer", 404);
        }
        return account;
    }
}
