import { PropertyTypeRepository, PropertyType, UpdatePropertyTypeRequest } from "../domain/property-type";
import { PaginationOptions, PaginatedResult } from "../domain/shared";
import { DBService } from "../entities/service";
import { z } from "zod";
import { logger } from "../lib/observability";

const DynamoPropertyTypeSchema = z.object({
    organizationId: z.string(),
    propertyTypeId: z.string(),
    name: z.string(),
    description: z.string().optional().nullable(),
    createdAt: z.union([z.string(), z.number()]).transform(v => String(v)),
    updatedAt: z.union([z.string(), z.number()]).optional().transform(v => v != null ? String(v) : undefined),
}).passthrough();

function parsePropertyType(data: unknown): PropertyType {
    const result = DynamoPropertyTypeSchema.safeParse(data);
    if (!result.success) {
        logger.error("Data validation failed reading from DynamoDB", { errors: result.error.issues, data });
        throw new Error(`Data integrity error: ${result.error.message}`);
    }
    return result.data as PropertyType;
}

const DEFAULT_PAGE_SIZE = 20;

export class DynamoPropertyTypeRepository implements PropertyTypeRepository {
    async create(propertyType: PropertyType): Promise<PropertyType> {
        const { createdAt, updatedAt, ...data } = propertyType;
        const result = await DBService.entities.propertyType.create(data).go();
        return parsePropertyType(result.data);
    }

    async get(organizationId: string, propertyTypeId: string): Promise<PropertyType | null> {
        const result = await DBService.entities.propertyType.get({ organizationId, propertyTypeId }).go();
        if (!result.data) return null;
        return parsePropertyType(result.data);
    }

    async list(organizationId: string, options?: PaginationOptions): Promise<PaginatedResult<PropertyType>> {
        const limit = options?.limit || DEFAULT_PAGE_SIZE;
        const result = await DBService.entities.propertyType.query.byPropertyTypeId({ organizationId }).go({
            limit,
            ...(options?.cursor && { cursor: options.cursor }),
        });
        return {
            items: result.data.map(parsePropertyType),
            cursor: result.cursor ?? null,
        };
    }

    async update(organizationId: string, propertyTypeId: string, data: UpdatePropertyTypeRequest): Promise<PropertyType> {
        const result = await DBService.entities.propertyType.patch({ organizationId, propertyTypeId }).set(data).go({ response: "all_new" });
        return parsePropertyType(result.data);
    }

    async delete(organizationId: string, propertyTypeId: string): Promise<void> {
        await DBService.entities.propertyType.delete({ organizationId, propertyTypeId }).go();
    }
}
