import { EntityCategory, CreateEntityCategoryRequest, EntityCategoryRepository, EntityType } from "../domain/entity-category";
import { EventPublisher, PaginationOptions, PaginatedResult } from "../domain/shared";
import { logger, metrics } from "../lib/observability";
import { MetricUnit } from "@aws-lambda-powertools/metrics";

export class EntityCategoryService {
    constructor(
        private repository: EntityCategoryRepository,
        private eventPublisher: EventPublisher
    ) {}

    async createEntityCategory(organizationId: string, request: CreateEntityCategoryRequest): Promise<EntityCategory> {
        logger.info("Assigning category to entity", { entityType: request.entityType, entityId: request.entityId, categoryId: request.categoryId });

        const ec: EntityCategory = {
            organizationId,
            entityType: request.entityType,
            entityId: request.entityId,
            categoryId: request.categoryId,
            createdAt: new Date().toISOString(),
        };

        const created = await this.repository.create(ec);
        metrics.addMetric('EntityCategoriesCreated', MetricUnit.Count, 1);
        return created;
    }

    async listByEntity(organizationId: string, entityType: EntityType, entityId: string, options?: PaginationOptions): Promise<PaginatedResult<EntityCategory>> {
        return this.repository.listByEntity(organizationId, entityType, entityId, options);
    }

    async listByCategory(organizationId: string, entityType: EntityType, categoryId: string, options?: PaginationOptions): Promise<PaginatedResult<EntityCategory>> {
        return this.repository.listByCategory(organizationId, entityType, categoryId, options);
    }

    async deleteEntityCategory(organizationId: string, entityType: EntityType, entityId: string, categoryId: string): Promise<void> {
        await this.repository.delete(organizationId, entityType, entityId, categoryId);
        logger.info("Entity category removed", { entityType, entityId, categoryId });
    }
}
