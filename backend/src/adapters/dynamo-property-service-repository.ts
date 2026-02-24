import { PropertyServiceRepository, PropertyService, UpdatePropertyServiceRequest } from "../domain/property-service";
import { PaginationOptions, PaginatedResult } from "../domain/shared";
import { DBService } from "../entities/service";
import { z } from "zod";
import { logger } from "../lib/observability";

const DynamoPropertyServiceSchema = z.object({
    serviceId: z.string(),
    propertyId: z.string(),
    serviceTypeId: z.string(),
    planId: z.string().optional().nullable(),
    status: z.enum(["active", "inactive", "cancelled"]),
    startDate: z.string().optional().nullable(),
    endDate: z.string().optional().nullable(),
    frequency: z.string().optional().nullable(),
    createdAt: z.union([z.string(), z.number()]).transform(v => String(v)),
    updatedAt: z.union([z.string(), z.number()]).optional().transform(v => v != null ? String(v) : undefined),
}).passthrough();

function parsePropertyService(data: unknown): PropertyService {
    const result = DynamoPropertyServiceSchema.safeParse(data);
    if (!result.success) {
        logger.error("Data validation failed reading from DynamoDB", { errors: result.error.issues, data });
        throw new Error(`Data integrity error: ${result.error.message}`);
    }
    return result.data as PropertyService;
}

const DEFAULT_PAGE_SIZE = 20;

export class DynamoPropertyServiceRepository implements PropertyServiceRepository {
    async create(propertyService: PropertyService): Promise<PropertyService> {
        const { createdAt, updatedAt, ...data } = propertyService;
        const result = await DBService.entities.propertyService.create(data).go();
        return parsePropertyService(result.data);
    }

    async get(serviceId: string): Promise<PropertyService | null> {
        const result = await DBService.entities.propertyService.get({ serviceId }).go();
        if (!result.data) return null;
        return parsePropertyService(result.data);
    }

    async listByPropertyId(propertyId: string, options?: PaginationOptions): Promise<PaginatedResult<PropertyService>> {
        const limit = options?.limit || DEFAULT_PAGE_SIZE;
        const result = await DBService.entities.propertyService.query.byPropertyId({ propertyId }).go({
            limit,
            ...(options?.cursor && { cursor: options.cursor }),
        });
        return {
            items: result.data.map(parsePropertyService),
            cursor: result.cursor ?? null,
        };
    }

    async update(serviceId: string, data: UpdatePropertyServiceRequest): Promise<PropertyService> {
        const result = await DBService.entities.propertyService.patch({ serviceId }).set(data).go({ response: "all_new" });
        return parsePropertyService(result.data);
    }

    async delete(serviceId: string): Promise<void> {
        await DBService.entities.propertyService.delete({ serviceId }).go();
    }
}
