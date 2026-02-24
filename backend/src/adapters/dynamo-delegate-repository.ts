import { DelegateRepository, Delegate } from "../domain/delegate";
import { PaginationOptions, PaginatedResult } from "../domain/shared";
import { DBService } from "../entities/service";
import { z } from "zod";
import { logger } from "../lib/observability";

const DynamoDelegateSchema = z.object({
    delegateId: z.string(),
    accountId: z.string(),
    email: z.string(),
    name: z.string(),
    permissions: z.array(z.string()).optional().nullable(),
    status: z.enum(["active", "inactive"]),
    createdAt: z.union([z.string(), z.number()]).transform(v => String(v)),
    updatedAt: z.union([z.string(), z.number()]).optional().transform(v => v != null ? String(v) : undefined),
}).passthrough();

function parseDelegate(data: unknown): Delegate {
    const result = DynamoDelegateSchema.safeParse(data);
    if (!result.success) {
        logger.error("Data validation failed reading from DynamoDB", { errors: result.error.issues, data });
        throw new Error(`Data integrity error: ${result.error.message}`);
    }
    return result.data as Delegate;
}

const DEFAULT_PAGE_SIZE = 20;

export class DynamoDelegateRepository implements DelegateRepository {
    async create(delegate: Delegate): Promise<Delegate> {
        const { createdAt, updatedAt, ...data } = delegate;
        const result = await DBService.entities.delegate.create(data).go();
        return parseDelegate(result.data);
    }

    async get(delegateId: string): Promise<Delegate | null> {
        const result = await DBService.entities.delegate.get({ delegateId }).go();
        if (!result.data) return null;
        return parseDelegate(result.data);
    }

    async listByAccountId(accountId: string, options?: PaginationOptions): Promise<PaginatedResult<Delegate>> {
        const limit = options?.limit || DEFAULT_PAGE_SIZE;
        const result = await DBService.entities.delegate.query.byAccountId({ accountId }).go({
            limit,
            ...(options?.cursor && { cursor: options.cursor }),
        });
        return {
            items: result.data.map(parseDelegate),
            cursor: result.cursor ?? null,
        };
    }

    async delete(delegateId: string): Promise<void> {
        await DBService.entities.delegate.delete({ delegateId }).go();
    }
}
