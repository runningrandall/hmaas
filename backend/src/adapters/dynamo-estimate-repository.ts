import { Estimate } from "../domain/estimate";
import { EstimateRepository } from "../ports/estimate-repository";
import { PaginationOptions, PaginatedResult } from "../domain/shared";
import { DBService } from "../entities/service";
import { z } from "zod";
import { logger } from "../lib/observability";

const DynamoEstimateLineItemSchema = z.object({
    serviceTypeId: z.string(),
    description: z.string(),
    quantity: z.number(),
    unit: z.string(),
    unitPrice: z.number(),
    total: z.number(),
    estimatedDuration: z.number().optional().nullable(),
});

const DynamoEstimateSchema = z.object({
    organizationId: z.string(),
    estimateId: z.string(),
    customerId: z.string(),
    propertyId: z.string(),
    estimateNumber: z.string(),
    estimateDate: z.string(),
    expirationDate: z.string().optional().nullable(),
    status: z.enum(["draft", "sent", "accepted", "rejected", "expired", "invoiced"]),
    subtotal: z.number(),
    tax: z.number(),
    total: z.number(),
    lineItems: z.array(DynamoEstimateLineItemSchema).optional().nullable(),
    notes: z.string().optional().nullable(),
    acceptedAt: z.string().optional().nullable(),
    invoiceId: z.string().optional().nullable(),
    createdAt: z.union([z.string(), z.number()]).transform(v => String(v)),
    updatedAt: z.union([z.string(), z.number()]).optional().transform(v => v != null ? String(v) : undefined),
}).passthrough();

function parseEstimate(data: unknown): Estimate {
    const result = DynamoEstimateSchema.safeParse(data);
    if (!result.success) {
        logger.error("Data validation failed reading from DynamoDB", { errors: result.error.issues, data });
        throw new Error(`Data integrity error: ${result.error.message}`);
    }
    return result.data as Estimate;
}

const DEFAULT_PAGE_SIZE = 20;

export class DynamoEstimateRepository implements EstimateRepository {
    async create(estimate: Estimate): Promise<Estimate> {
        const { createdAt, updatedAt, ...data } = estimate;
        const result = await DBService.entities.estimate.create(data).go();
        return parseEstimate(result.data);
    }

    async get(organizationId: string, estimateId: string): Promise<Estimate | null> {
        const result = await DBService.entities.estimate.get({ organizationId, estimateId }).go();
        if (!result.data) return null;
        return parseEstimate(result.data);
    }

    async listByCustomerId(organizationId: string, customerId: string, options?: PaginationOptions): Promise<PaginatedResult<Estimate>> {
        const limit = options?.limit || DEFAULT_PAGE_SIZE;
        const result = await DBService.entities.estimate.query.byCustomerId({ organizationId, customerId }).go({
            limit,
            ...(options?.cursor && { cursor: options.cursor }),
        });
        return {
            items: result.data.map(parseEstimate),
            cursor: result.cursor ?? null,
        };
    }

    async update(organizationId: string, estimateId: string, data: Record<string, unknown>): Promise<Estimate> {
        const result = await DBService.entities.estimate.patch({ organizationId, estimateId }).set(data).go({ response: "all_new" });
        return parseEstimate(result.data);
    }

    async delete(organizationId: string, estimateId: string): Promise<void> {
        await DBService.entities.estimate.delete({ organizationId, estimateId }).go();
    }
}
