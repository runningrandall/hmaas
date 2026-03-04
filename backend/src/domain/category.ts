import { PaginationOptions, PaginatedResult } from "./shared";

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

export interface CategoryRepository {
    create(category: Category): Promise<Category>;
    get(organizationId: string, categoryId: string): Promise<Category | null>;
    list(organizationId: string, options?: PaginationOptions): Promise<PaginatedResult<Category>>;
    update(organizationId: string, categoryId: string, data: UpdateCategoryRequest): Promise<Category>;
    delete(organizationId: string, categoryId: string): Promise<void>;
}
