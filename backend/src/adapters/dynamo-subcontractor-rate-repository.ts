import { SubcontractorRate, UpdateSubcontractorRateRequest } from "../domain/subcontractor-rate";
import { SubcontractorRateRepository } from "../ports/subcontractor-rate-repository";
import { PaginationOptions, PaginatedResult } from "../domain/shared";
import { DBService } from "../entities/service";
import { z } from "zod";
import { logger } from "../lib/observability";

const DynamoSubcontractorRateSchema = z.object({
    organizationId: z.string(),
    subcontractorRateId: z.string(),
    subcontractorId: z.string(),
    propertyId: z.string(),
    serviceTypeId: z.string(),
    rate: z.number(),
    unit: z.string(),
    effectiveDate: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    createdAt: z.union([z.string(), z.number()]).transform(v => String(v)),
    updatedAt: z.union([z.string(), z.number()]).optional().transform(v => v != null ? String(v) : undefined),
}).passthrough();

function parseSubcontractorRate(data: unknown): SubcontractorRate {
    const result = DynamoSubcontractorRateSchema.safeParse(data);
    if (!result.success) {
        logger.error("Data validation failed reading from DynamoDB", { errors: result.error.issues, data });
        throw new Error(`Data integrity error: ${result.error.message}`);
    }
    return result.data as SubcontractorRate;
}

const DEFAULT_PAGE_SIZE = 20;

export class DynamoSubcontractorRateRepository implements SubcontractorRateRepository {
    async create(rate: SubcontractorRate): Promise<SubcontractorRate> {
        const { createdAt, updatedAt, ...data } = rate;
        const result = await DBService.entities.subcontractorRate.create(data).go();
        return parseSubcontractorRate(result.data);
    }

    async get(organizationId: string, subcontractorRateId: string): Promise<SubcontractorRate | null> {
        const result = await DBService.entities.subcontractorRate.get({ organizationId, subcontractorRateId }).go();
        if (!result.data) return null;
        return parseSubcontractorRate(result.data);
    }

    async listBySubcontractorId(organizationId: string, subcontractorId: string, options?: PaginationOptions): Promise<PaginatedResult<SubcontractorRate>> {
        const limit = options?.limit || DEFAULT_PAGE_SIZE;
        const result = await DBService.entities.subcontractorRate.query.bySubcontractorId({ organizationId, subcontractorId }).go({
            limit,
            ...(options?.cursor && { cursor: options.cursor }),
        });
        return {
            items: result.data.map(parseSubcontractorRate),
            cursor: result.cursor ?? null,
        };
    }

    async update(organizationId: string, subcontractorRateId: string, data: UpdateSubcontractorRateRequest): Promise<SubcontractorRate> {
        const result = await DBService.entities.subcontractorRate.patch({ organizationId, subcontractorRateId }).set(data).go({ response: "all_new" });
        return parseSubcontractorRate(result.data);
    }

    async delete(organizationId: string, subcontractorRateId: string): Promise<void> {
        await DBService.entities.subcontractorRate.delete({ organizationId, subcontractorRateId }).go();
    }
}
