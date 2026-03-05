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
