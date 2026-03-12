import { apiGet, apiPost, apiPut, apiDelete } from './client';

export interface Category {
    organizationId: string;
    categoryId: string;
    name: string;
    description?: string;
    createdAt: string;
    updatedAt?: string;
}

export interface CreateCategoryData {
    name: string;
    description?: string;
}

export interface UpdateCategoryData {
    name?: string;
    description?: string;
}

export interface PaginatedCategories {
    items: Category[];
    cursor?: string | null;
}

export const categoriesApi = {
    list: () => apiGet<PaginatedCategories>('categories'),
    get: (id: string) => apiGet<Category>(`categories/${id}`),
    create: (data: CreateCategoryData) => apiPost<Category>('categories', data),
    update: (id: string, data: UpdateCategoryData) => apiPut<Category>(`categories/${id}`, data),
    delete: (id: string) => apiDelete(`categories/${id}`),
};

export interface EntityCategory {
    organizationId: string;
    entityType: string;
    entityId: string;
    categoryId: string;
    createdAt: string;
    updatedAt?: string;
}

export interface PaginatedEntityCategories {
    items: EntityCategory[];
    cursor?: string | null;
}

export const serviceTypeCategoriesApi = {
    list: (serviceTypeId: string) => apiGet<PaginatedEntityCategories>(`service-types/${serviceTypeId}/categories`),
    add: (serviceTypeId: string, categoryId: string) => apiPost<EntityCategory>(`service-types/${serviceTypeId}/categories`, { categoryId }),
    remove: (serviceTypeId: string, categoryId: string) => apiDelete(`service-types/${serviceTypeId}/categories/${categoryId}`),
};

export const planCategoriesApi = {
    list: (planId: string) => apiGet<PaginatedEntityCategories>(`plans/${planId}/categories`),
    add: (planId: string, categoryId: string) => apiPost<EntityCategory>(`plans/${planId}/categories`, { categoryId }),
    remove: (planId: string, categoryId: string) => apiDelete(`plans/${planId}/categories/${categoryId}`),
};

export const propertyCategoriesApi = {
    list: (propertyId: string) => apiGet<PaginatedEntityCategories>(`properties/${propertyId}/categories`),
    add: (propertyId: string, categoryId: string) => apiPost<EntityCategory>(`properties/${propertyId}/categories`, { categoryId }),
    remove: (propertyId: string, categoryId: string) => apiDelete(`properties/${propertyId}/categories/${categoryId}`),
};
