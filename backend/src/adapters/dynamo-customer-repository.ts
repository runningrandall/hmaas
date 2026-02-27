import { CustomerRepository, Customer, UpdateCustomerRequest } from "../domain/customer";
import { PaginationOptions, PaginatedResult } from "../domain/shared";
import { DBService } from "../entities/service";
import { z } from "zod";
import { logger } from "../lib/observability";

const DynamoCustomerSchema = z.object({
    organizationId: z.string(),
    customerId: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    email: z.string(),
    phone: z.string().optional().nullable(),
    status: z.enum(["active", "inactive", "suspended"]),
    notes: z.string().optional().nullable(),
    createdAt: z.union([z.string(), z.number()]).transform(v => String(v)),
    updatedAt: z.union([z.string(), z.number()]).optional().transform(v => v != null ? String(v) : undefined),
}).passthrough();

function parseCustomer(data: unknown): Customer {
    const result = DynamoCustomerSchema.safeParse(data);
    if (!result.success) {
        logger.error("Data validation failed reading from DynamoDB", { errors: result.error.issues, data });
        throw new Error(`Data integrity error: ${result.error.message}`);
    }
    return result.data as Customer;
}

const DEFAULT_PAGE_SIZE = 20;

export class DynamoCustomerRepository implements CustomerRepository {
    async create(customer: Customer): Promise<Customer> {
        const { createdAt, updatedAt, ...data } = customer;
        const result = await DBService.entities.customer.create(data).go();
        return parseCustomer(result.data);
    }

    async get(organizationId: string, customerId: string): Promise<Customer | null> {
        const result = await DBService.entities.customer.get({ organizationId, customerId }).go();
        if (!result.data) return null;
        return parseCustomer(result.data);
    }

    async list(organizationId: string, options?: PaginationOptions): Promise<PaginatedResult<Customer>> {
        const limit = options?.limit || DEFAULT_PAGE_SIZE;
        const result = await DBService.entities.customer.query.byCustomerId({ organizationId }).go({
            limit,
            ...(options?.cursor && { cursor: options.cursor }),
        });
        return {
            items: result.data.map(parseCustomer),
            cursor: result.cursor ?? null,
        };
    }

    async update(organizationId: string, customerId: string, data: UpdateCustomerRequest): Promise<Customer> {
        const result = await DBService.entities.customer.patch({ organizationId, customerId }).set(data).go({ response: "all_new" });
        return parseCustomer(result.data);
    }

    async delete(organizationId: string, customerId: string): Promise<void> {
        await DBService.entities.customer.delete({ organizationId, customerId }).go();
    }
}
