import { PaginationOptions, PaginatedResult } from "./shared";

export type EntityType = "serviceType" | "plan";

export interface EntityCategory {
    organizationId: string;
    entityType: EntityType;
    entityId: string;
    categoryId: string;
    createdAt: string;
    updatedAt?: string;
}

export interface CreateEntityCategoryRequest {
    entityType: EntityType;
    entityId: string;
    categoryId: string;
}

export interface EntityCategoryRepository {
    create(ec: EntityCategory): Promise<EntityCategory>;
    listByEntity(organizationId: string, entityType: EntityType, entityId: string, options?: PaginationOptions): Promise<PaginatedResult<EntityCategory>>;
    listByCategory(organizationId: string, entityType: EntityType, categoryId: string, options?: PaginationOptions): Promise<PaginatedResult<EntityCategory>>;
    delete(organizationId: string, entityType: EntityType, entityId: string, categoryId: string): Promise<void>;
}
