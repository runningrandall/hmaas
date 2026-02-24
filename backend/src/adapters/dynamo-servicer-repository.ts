import { ServicerRepository, Servicer, UpdateServicerRequest } from "../domain/servicer";
import { PaginationOptions, PaginatedResult } from "../domain/shared";
import { DBService } from "../entities/service";
import { z } from "zod";
import { logger } from "../lib/observability";

const DynamoServicerSchema = z.object({
    servicerId: z.string(),
    employeeId: z.string(),
    serviceArea: z.string().optional().nullable(),
    maxDailyJobs: z.number().optional().nullable(),
    rating: z.number().optional().nullable(),
    status: z.enum(["active", "inactive"]),
    createdAt: z.union([z.string(), z.number()]).transform(v => String(v)),
    updatedAt: z.union([z.string(), z.number()]).optional().transform(v => v != null ? String(v) : undefined),
}).passthrough();

function parseServicer(data: unknown): Servicer {
    const result = DynamoServicerSchema.safeParse(data);
    if (!result.success) {
        logger.error("Data validation failed reading from DynamoDB", { errors: result.error.issues, data });
        throw new Error(`Data integrity error: ${result.error.message}`);
    }
    return result.data as Servicer;
}

const DEFAULT_PAGE_SIZE = 20;

export class DynamoServicerRepository implements ServicerRepository {
    async create(servicer: Servicer): Promise<Servicer> {
        const { createdAt, updatedAt, ...data } = servicer;
        const result = await DBService.entities.servicer.create(data).go();
        return parseServicer(result.data);
    }

    async get(servicerId: string): Promise<Servicer | null> {
        const result = await DBService.entities.servicer.get({ servicerId }).go();
        if (!result.data) return null;
        return parseServicer(result.data);
    }

    async getByEmployeeId(employeeId: string, options?: PaginationOptions): Promise<PaginatedResult<Servicer>> {
        const limit = options?.limit || DEFAULT_PAGE_SIZE;
        const result = await DBService.entities.servicer.query.byEmployeeId({ employeeId }).go({
            limit,
            ...(options?.cursor && { cursor: options.cursor }),
        });
        return {
            items: result.data.map(parseServicer),
            cursor: result.cursor ?? null,
        };
    }

    async update(servicerId: string, data: UpdateServicerRequest): Promise<Servicer> {
        const result = await DBService.entities.servicer.patch({ servicerId }).set(data).go({ response: "all_new" });
        return parseServicer(result.data);
    }

    async delete(servicerId: string): Promise<void> {
        await DBService.entities.servicer.delete({ servicerId }).go();
    }
}
