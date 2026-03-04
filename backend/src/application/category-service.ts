import { Category, CreateCategoryRequest, UpdateCategoryRequest, CategoryRepository } from "../domain/category";
import { EventPublisher, PaginationOptions, PaginatedResult } from "../domain/shared";
import { randomUUID } from "crypto";
import { logger, metrics } from "../lib/observability";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { AppError } from "../lib/error";

export class CategoryService {
    constructor(
        private repository: CategoryRepository,
        private eventPublisher: EventPublisher
    ) {}

    async createCategory(organizationId: string, request: CreateCategoryRequest): Promise<Category> {
        logger.info("Creating category", { name: request.name });

        const category: Category = {
            organizationId,
            categoryId: randomUUID(),
            name: request.name,
            description: request.description,
            createdAt: new Date().toISOString(),
        };

        const created = await this.repository.create(category);
        metrics.addMetric('CategoriesCreated', MetricUnit.Count, 1);
        return created;
    }

    async getCategory(organizationId: string, categoryId: string): Promise<Category> {
        const category = await this.repository.get(organizationId, categoryId);
        if (!category) {
            throw new AppError("Category not found", 404);
        }
        return category;
    }

    async listCategories(organizationId: string, options?: PaginationOptions): Promise<PaginatedResult<Category>> {
        return this.repository.list(organizationId, options);
    }

    async updateCategory(organizationId: string, categoryId: string, request: UpdateCategoryRequest): Promise<Category> {
        await this.getCategory(organizationId, categoryId);
        return this.repository.update(organizationId, categoryId, request);
    }

    async deleteCategory(organizationId: string, categoryId: string): Promise<void> {
        await this.repository.delete(organizationId, categoryId);
        logger.info("Category deleted", { categoryId });
    }
}
