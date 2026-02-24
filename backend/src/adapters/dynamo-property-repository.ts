import { PropertyRepository, Property, UpdatePropertyRequest } from "../domain/property";
import { PaginationOptions, PaginatedResult } from "../domain/shared";
import { DBService } from "../entities/service";
import { z } from "zod";
import { logger } from "../lib/observability";

const DynamoPropertySchema = z.object({
    propertyId: z.string(),
    customerId: z.string(),
    propertyTypeId: z.string(),
    name: z.string(),
    address: z.string(),
    city: z.string(),
    state: z.string(),
    zip: z.string(),
    lat: z.number().optional().nullable(),
    lng: z.number().optional().nullable(),
    lotSize: z.number().optional().nullable(),
    notes: z.string().optional().nullable(),
    status: z.enum(["active", "inactive"]),
    createdAt: z.union([z.string(), z.number()]).transform(v => String(v)),
    updatedAt: z.union([z.string(), z.number()]).optional().transform(v => v != null ? String(v) : undefined),
}).passthrough();

function parseProperty(data: unknown): Property {
    const result = DynamoPropertySchema.safeParse(data);
    if (!result.success) {
        logger.error("Data validation failed reading from DynamoDB", { errors: result.error.issues, data });
        throw new Error(`Data integrity error: ${result.error.message}`);
    }
    return result.data as Property;
}

const DEFAULT_PAGE_SIZE = 20;

export class DynamoPropertyRepository implements PropertyRepository {
    async create(property: Property): Promise<Property> {
        const { createdAt, updatedAt, ...data } = property;
        const result = await DBService.entities.property.create(data).go();
        return parseProperty(result.data);
    }

    async get(propertyId: string): Promise<Property | null> {
        const result = await DBService.entities.property.get({ propertyId }).go();
        if (!result.data) return null;
        return parseProperty(result.data);
    }

    async listByCustomerId(customerId: string, options?: PaginationOptions): Promise<PaginatedResult<Property>> {
        const limit = options?.limit || DEFAULT_PAGE_SIZE;
        const result = await DBService.entities.property.query.byCustomerId({ customerId }).go({
            limit,
            ...(options?.cursor && { cursor: options.cursor }),
        });
        return {
            items: result.data.map(parseProperty),
            cursor: result.cursor ?? null,
        };
    }

    async update(propertyId: string, data: UpdatePropertyRequest): Promise<Property> {
        const result = await DBService.entities.property.patch({ propertyId }).set(data).go({ response: "all_new" });
        return parseProperty(result.data);
    }

    async delete(propertyId: string): Promise<void> {
        await DBService.entities.property.delete({ propertyId }).go();
    }
}
