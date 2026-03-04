import { CategoryRepository, Category, UpdateCategoryRequest } from "../domain/category";
import { PaginationOptions, PaginatedResult } from "../domain/shared";
import { DBService } from "../entities/service";
import { z } from "zod";
import { logger } from "../lib/observability";

const DynamoCategorySchema = z.object({
    organizationId: z.string(),
    categoryId: z.string(),
    name: z.string(),
    description: z.string().optional().nullable(),
    createdAt: z.union([z.string(), z.number()]).transform(v => String(v)),
    updatedAt: z.union([z.string(), z.number()]).optional().transform(v => v != null ? String(v) : undefined),
}).passthrough();

function parseCategory(data: unknown): Category {
    const result = DynamoCategorySchema.safeParse(data);
    if (!result.success) {
        logger.error("Data validation failed reading from DynamoDB", { errors: result.error.issues, data });
        throw new Error(`Data integrity error: ${result.error.message}`);
    }
    return result.data as Category;
}

const DEFAULT_PAGE_SIZE = 20;

export class DynamoCategoryRepository implements CategoryRepository {
    async create(category: Category): Promise<Category> {
        const { createdAt, updatedAt, ...data } = category;
        const result = await DBService.entities.category.create(data).go();
        return parseCategory(result.data);
    }

    async get(organizationId: string, categoryId: string): Promise<Category | null> {
        const result = await DBService.entities.category.get({ organizationId, categoryId }).go();
        if (!result.data) return null;
        return parseCategory(result.data);
    }

    async list(organizationId: string, options?: PaginationOptions): Promise<PaginatedResult<Category>> {
        const limit = options?.limit || DEFAULT_PAGE_SIZE;
        const result = await DBService.entities.category.query.byOrgCategories({ organizationId }).go({
            limit,
            ...(options?.cursor && { cursor: options.cursor }),
        });
        return {
            items: result.data.map(parseCategory),
            cursor: result.cursor ?? null,
        };
    }

    async update(organizationId: string, categoryId: string, data: UpdateCategoryRequest): Promise<Category> {
        const result = await DBService.entities.category.patch({ organizationId, categoryId }).set(data).go({ response: "all_new" });
        return parseCategory(result.data);
    }

    async delete(organizationId: string, categoryId: string): Promise<void> {
        await DBService.entities.category.delete({ organizationId, categoryId }).go();
    }
}
