import { EntityCategoryRepository, EntityCategory, EntityType } from "../domain/entity-category";
import { PaginationOptions, PaginatedResult } from "../domain/shared";
import { DBService } from "../entities/service";
import { z } from "zod";
import { logger } from "../lib/observability";

const DynamoEntityCategorySchema = z.object({
    organizationId: z.string(),
    entityType: z.string(),
    entityId: z.string(),
    categoryId: z.string(),
    createdAt: z.union([z.string(), z.number()]).transform(v => String(v)),
    updatedAt: z.union([z.string(), z.number()]).optional().transform(v => v != null ? String(v) : undefined),
}).passthrough();

function parseEntityCategory(data: unknown): EntityCategory {
    const result = DynamoEntityCategorySchema.safeParse(data);
    if (!result.success) {
        logger.error("Data validation failed reading from DynamoDB", { errors: result.error.issues, data });
        throw new Error(`Data integrity error: ${result.error.message}`);
    }
    return result.data as EntityCategory;
}

const DEFAULT_PAGE_SIZE = 20;

export class DynamoEntityCategoryRepository implements EntityCategoryRepository {
    async create(ec: EntityCategory): Promise<EntityCategory> {
        const { createdAt, updatedAt, ...data } = ec;
        const result = await DBService.entities.entityCategory.create(data).go();
        return parseEntityCategory(result.data);
    }

    async listByEntity(organizationId: string, entityType: EntityType, entityId: string, options?: PaginationOptions): Promise<PaginatedResult<EntityCategory>> {
        const limit = options?.limit || DEFAULT_PAGE_SIZE;
        const result = await DBService.entities.entityCategory.query.byEntityAndCategory({ organizationId, entityType, entityId }).go({
            limit,
            ...(options?.cursor && { cursor: options.cursor }),
        });
        return {
            items: result.data.map(parseEntityCategory),
            cursor: result.cursor ?? null,
        };
    }

    async listByCategory(organizationId: string, entityType: EntityType, categoryId: string, options?: PaginationOptions): Promise<PaginatedResult<EntityCategory>> {
        const limit = options?.limit || DEFAULT_PAGE_SIZE;
        const result = await DBService.entities.entityCategory.query.byCategoryId({ organizationId, entityType, categoryId }).go({
            limit,
            ...(options?.cursor && { cursor: options.cursor }),
        });
        return {
            items: result.data.map(parseEntityCategory),
            cursor: result.cursor ?? null,
        };
    }

    async delete(organizationId: string, entityType: EntityType, entityId: string, categoryId: string): Promise<void> {
        await DBService.entities.entityCategory.delete({ organizationId, entityType, entityId, categoryId }).go();
    }
}
