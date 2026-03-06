export interface Category {
    organizationId: string;
    categoryId: string;
    name: string;
    description?: string;
    createdAt: string;
    updatedAt?: string;
}

export interface CreateCategoryRequest {
    name: string;
    description?: string;
}

export interface UpdateCategoryRequest {
    name?: string;
    description?: string;
}
