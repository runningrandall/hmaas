import { EntityCategory, EntityType } from "../domain/entity-category";
import { PaginationOptions, PaginatedResult } from "../domain/shared";

export interface EntityCategoryRepository {
    create(ec: EntityCategory): Promise<EntityCategory>;
    listByEntity(organizationId: string, entityType: EntityType, entityId: string, options?: PaginationOptions): Promise<PaginatedResult<EntityCategory>>;
    listByCategory(organizationId: string, entityType: EntityType, categoryId: string, options?: PaginationOptions): Promise<PaginatedResult<EntityCategory>>;
    delete(organizationId: string, entityType: EntityType, entityId: string, categoryId: string): Promise<void>;
}
