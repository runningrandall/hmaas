import { AccountRepository, Account, UpdateAccountRequest } from "../domain/account";
import { DBService } from "../entities/service";
import { z } from "zod";
import { logger } from "../lib/observability";

const DynamoAccountSchema = z.object({
    organizationId: z.string(),
    accountId: z.string(),
    customerId: z.string(),
    cognitoUserId: z.string().optional().nullable(),
    planId: z.string().optional().nullable(),
    status: z.enum(["active", "inactive", "suspended"]),
    billingEmail: z.string().optional().nullable(),
    createdAt: z.union([z.string(), z.number()]).transform(v => String(v)),
    updatedAt: z.union([z.string(), z.number()]).optional().transform(v => v != null ? String(v) : undefined),
}).passthrough();

function parseAccount(data: unknown): Account {
    const result = DynamoAccountSchema.safeParse(data);
    if (!result.success) {
        logger.error("Data validation failed reading from DynamoDB", { errors: result.error.issues, data });
        throw new Error(`Data integrity error: ${result.error.message}`);
    }
    return result.data as Account;
}

export class DynamoAccountRepository implements AccountRepository {
    async create(account: Account): Promise<Account> {
        const { createdAt, updatedAt, ...data } = account;
        const result = await DBService.entities.account.create(data).go();
        return parseAccount(result.data);
    }

    async get(organizationId: string, accountId: string): Promise<Account | null> {
        const result = await DBService.entities.account.get({ organizationId, accountId }).go();
        if (!result.data) return null;
        return parseAccount(result.data);
    }

    async getByCustomerId(organizationId: string, customerId: string): Promise<Account | null> {
        const result = await DBService.entities.account.query.byCustomerId({ organizationId, customerId }).go();
        if (!result.data || result.data.length === 0) return null;
        return parseAccount(result.data[0]);
    }

    async update(organizationId: string, accountId: string, data: UpdateAccountRequest): Promise<Account> {
        const result = await DBService.entities.account.patch({ organizationId, accountId }).set(data).go({ response: "all_new" });
        return parseAccount(result.data);
    }

    async delete(organizationId: string, accountId: string): Promise<void> {
        await DBService.entities.account.delete({ organizationId, accountId }).go();
    }
}
