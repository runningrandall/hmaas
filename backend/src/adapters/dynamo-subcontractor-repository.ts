import { Subcontractor, UpdateSubcontractorRequest } from "../domain/subcontractor";
import { SubcontractorRepository } from "../ports/subcontractor-repository";
import { PaginationOptions, PaginatedResult } from "../domain/shared";
import { DBService } from "../entities/service";
import { z } from "zod";
import { logger } from "../lib/observability";

const DynamoSubcontractorSchema = z.object({
    organizationId: z.string(),
    subcontractorId: z.string(),
    name: z.string(),
    contactName: z.string().optional().nullable(),
    email: z.string(),
    phone: z.string().optional().nullable(),
    status: z.enum(["active", "inactive"]),
    notes: z.string().optional().nullable(),
    createdAt: z.union([z.string(), z.number()]).transform(v => String(v)),
    updatedAt: z.union([z.string(), z.number()]).optional().transform(v => v != null ? String(v) : undefined),
}).passthrough();

function parseSubcontractor(data: unknown): Subcontractor {
    const result = DynamoSubcontractorSchema.safeParse(data);
    if (!result.success) {
        logger.error("Data validation failed reading from DynamoDB", { errors: result.error.issues, data });
        throw new Error(`Data integrity error: ${result.error.message}`);
    }
    return result.data as Subcontractor;
}

const DEFAULT_PAGE_SIZE = 20;

export class DynamoSubcontractorRepository implements SubcontractorRepository {
    async create(subcontractor: Subcontractor): Promise<Subcontractor> {
        const { createdAt, updatedAt, ...data } = subcontractor;
        const result = await DBService.entities.subcontractor.create(data).go();
        return parseSubcontractor(result.data);
    }

    async get(organizationId: string, subcontractorId: string): Promise<Subcontractor | null> {
        const result = await DBService.entities.subcontractor.get({ organizationId, subcontractorId }).go();
        if (!result.data) return null;
        return parseSubcontractor(result.data);
    }

    async list(organizationId: string, options?: PaginationOptions): Promise<PaginatedResult<Subcontractor>> {
        const limit = options?.limit || DEFAULT_PAGE_SIZE;
        const result = await DBService.entities.subcontractor.query.byStatus({ organizationId, status: "active" }).go({
            limit,
            ...(options?.cursor && { cursor: options.cursor }),
        });
        return {
            items: result.data.map(parseSubcontractor),
            cursor: result.cursor ?? null,
        };
    }

    async update(organizationId: string, subcontractorId: string, data: UpdateSubcontractorRequest): Promise<Subcontractor> {
        const result = await DBService.entities.subcontractor.patch({ organizationId, subcontractorId }).set(data).go({ response: "all_new" });
        return parseSubcontractor(result.data);
    }

    async delete(organizationId: string, subcontractorId: string): Promise<void> {
        await DBService.entities.subcontractor.delete({ organizationId, subcontractorId }).go();
    }
}
