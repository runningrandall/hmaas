import { describe, it, expect, vi, beforeEach } from 'vitest';
import { categoriesApi, serviceTypeCategoriesApi, planCategoriesApi } from '../../../lib/api/categories';
import * as client from '../../../lib/api/client';

vi.mock('../../../lib/api/client', () => ({
    apiGet: vi.fn(),
    apiPost: vi.fn(),
    apiPut: vi.fn(),
    apiDelete: vi.fn(),
}));

describe('categoriesApi', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should list categories', async () => {
        const mockResult = { items: [{ categoryId: 'cat-1', name: 'Outdoor' }] };
        vi.mocked(client.apiGet).mockResolvedValue(mockResult);

        const result = await categoriesApi.list();

        expect(client.apiGet).toHaveBeenCalledWith('categories');
        expect(result).toEqual(mockResult);
    });

    it('should get a category', async () => {
        const mockCat = { categoryId: 'cat-1', name: 'Outdoor' };
        vi.mocked(client.apiGet).mockResolvedValue(mockCat);

        const result = await categoriesApi.get('cat-1');

        expect(client.apiGet).toHaveBeenCalledWith('categories/cat-1');
        expect(result).toEqual(mockCat);
    });

    it('should create a category', async () => {
        const mockCat = { categoryId: 'cat-1', name: 'Outdoor' };
        vi.mocked(client.apiPost).mockResolvedValue(mockCat);

        const result = await categoriesApi.create({ name: 'Outdoor' });

        expect(client.apiPost).toHaveBeenCalledWith('categories', { name: 'Outdoor' });
        expect(result).toEqual(mockCat);
    });

    it('should update a category', async () => {
        const mockCat = { categoryId: 'cat-1', name: 'Updated' };
        vi.mocked(client.apiPut).mockResolvedValue(mockCat);

        const result = await categoriesApi.update('cat-1', { name: 'Updated' });

        expect(client.apiPut).toHaveBeenCalledWith('categories/cat-1', { name: 'Updated' });
        expect(result).toEqual(mockCat);
    });

    it('should delete a category', async () => {
        vi.mocked(client.apiDelete).mockResolvedValue(undefined);

        await categoriesApi.delete('cat-1');

        expect(client.apiDelete).toHaveBeenCalledWith('categories/cat-1');
    });
});

describe('serviceTypeCategoriesApi', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should list categories for a service type', async () => {
        const mockResult = { items: [{ entityType: 'serviceType', entityId: 'st-1', categoryId: 'cat-1' }] };
        vi.mocked(client.apiGet).mockResolvedValue(mockResult);

        const result = await serviceTypeCategoriesApi.list('st-1');

        expect(client.apiGet).toHaveBeenCalledWith('service-types/st-1/categories');
        expect(result).toEqual(mockResult);
    });

    it('should add a category to a service type', async () => {
        const mockEc = { entityType: 'serviceType', entityId: 'st-1', categoryId: 'cat-1' };
        vi.mocked(client.apiPost).mockResolvedValue(mockEc);

        const result = await serviceTypeCategoriesApi.add('st-1', 'cat-1');

        expect(client.apiPost).toHaveBeenCalledWith('service-types/st-1/categories', { categoryId: 'cat-1' });
        expect(result).toEqual(mockEc);
    });

    it('should remove a category from a service type', async () => {
        vi.mocked(client.apiDelete).mockResolvedValue(undefined);

        await serviceTypeCategoriesApi.remove('st-1', 'cat-1');

        expect(client.apiDelete).toHaveBeenCalledWith('service-types/st-1/categories/cat-1');
    });
});

describe('planCategoriesApi', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should list categories for a plan', async () => {
        const mockResult = { items: [{ entityType: 'plan', entityId: 'plan-1', categoryId: 'cat-1' }] };
        vi.mocked(client.apiGet).mockResolvedValue(mockResult);

        const result = await planCategoriesApi.list('plan-1');

        expect(client.apiGet).toHaveBeenCalledWith('plans/plan-1/categories');
        expect(result).toEqual(mockResult);
    });

    it('should add a category to a plan', async () => {
        const mockEc = { entityType: 'plan', entityId: 'plan-1', categoryId: 'cat-1' };
        vi.mocked(client.apiPost).mockResolvedValue(mockEc);

        const result = await planCategoriesApi.add('plan-1', 'cat-1');

        expect(client.apiPost).toHaveBeenCalledWith('plans/plan-1/categories', { categoryId: 'cat-1' });
        expect(result).toEqual(mockEc);
    });

    it('should remove a category from a plan', async () => {
        vi.mocked(client.apiDelete).mockResolvedValue(undefined);

        await planCategoriesApi.remove('plan-1', 'cat-1');

        expect(client.apiDelete).toHaveBeenCalledWith('plans/plan-1/categories/cat-1');
    });
});
