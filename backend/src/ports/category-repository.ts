import { Category, UpdateCategoryRequest } from "../domain/category";
import { PaginationOptions, PaginatedResult } from "../domain/shared";

export interface CategoryRepository {
    create(category: Category): Promise<Category>;
    get(organizationId: string, categoryId: string): Promise<Category | null>;
    list(organizationId: string, options?: PaginationOptions): Promise<PaginatedResult<Category>>;
    update(organizationId: string, categoryId: string, data: UpdateCategoryRequest): Promise<Category>;
    delete(organizationId: string, categoryId: string): Promise<void>;
}
