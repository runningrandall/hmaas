import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/observability', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), addContext: vi.fn() },
    tracer: { captureAWSv3Client: (c: any) => c },
    metrics: { addMetric: vi.fn() },
}));

import { CategoryService } from '../../src/application/category-service';
import { AppError } from '../../src/lib/error';

const mockRepo = {
    create: vi.fn(),
    get: vi.fn(),
    list: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
};

const mockPublisher = { publish: vi.fn() };

const ORG_ID = 'GLOBAL';

describe('CategoryService', () => {
    let service: CategoryService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new CategoryService(mockRepo as any, mockPublisher as any);
    });

    describe('createCategory', () => {
        it('should create category, record metric, and return created', async () => {
            const request = { name: 'Outdoor', description: 'Outdoor services' };
            const created = { organizationId: ORG_ID, categoryId: 'cat-1', ...request, createdAt: '2024-01-01T00:00:00.000Z' };
            mockRepo.create.mockResolvedValue(created);

            const { metrics } = await import('../../src/lib/observability');

            const result = await service.createCategory(ORG_ID, request);

            expect(result).toEqual(created);
            expect(mockRepo.create).toHaveBeenCalledOnce();
            expect(metrics.addMetric).toHaveBeenCalledWith('CategoriesCreated', expect.any(String), 1);
        });

        it('should populate categoryId and createdAt', async () => {
            const request = { name: 'Indoor' };
            mockRepo.create.mockImplementation(async (cat: any) => cat);

            const result = await service.createCategory(ORG_ID, request);

            expect(result.categoryId).toEqual(expect.any(String));
            expect(result.createdAt).toEqual(expect.any(String));
        });
    });

    describe('getCategory', () => {
        it('should return category when found', async () => {
            const category = { organizationId: ORG_ID, categoryId: 'cat-1', name: 'Outdoor' };
            mockRepo.get.mockResolvedValue(category);

            const result = await service.getCategory(ORG_ID, 'cat-1');

            expect(result).toEqual(category);
            expect(mockRepo.get).toHaveBeenCalledWith(ORG_ID, 'cat-1');
        });

        it('should throw AppError 404 when category not found', async () => {
            mockRepo.get.mockResolvedValue(null);

            await expect(service.getCategory(ORG_ID, 'missing')).rejects.toThrow(AppError);
            await expect(service.getCategory(ORG_ID, 'missing')).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    describe('listCategories', () => {
        it('should delegate to repo.list', async () => {
            const paginated = { items: [{ organizationId: ORG_ID, categoryId: 'cat-1' }], count: 1 };
            mockRepo.list.mockResolvedValue(paginated);

            const result = await service.listCategories(ORG_ID, { limit: 10 });

            expect(result).toEqual(paginated);
            expect(mockRepo.list).toHaveBeenCalledWith(ORG_ID, { limit: 10 });
        });
    });

    describe('updateCategory', () => {
        it('should update category and return updated', async () => {
            const existing = { organizationId: ORG_ID, categoryId: 'cat-1', name: 'Outdoor' };
            const updated = { organizationId: ORG_ID, categoryId: 'cat-1', name: 'Premium Outdoor' };
            mockRepo.get.mockResolvedValue(existing);
            mockRepo.update.mockResolvedValue(updated);

            const result = await service.updateCategory(ORG_ID, 'cat-1', { name: 'Premium Outdoor' });

            expect(result).toEqual(updated);
        });

        it('should throw 404 if category not found', async () => {
            mockRepo.get.mockResolvedValue(null);

            await expect(service.updateCategory(ORG_ID, 'missing', { name: 'x' })).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    describe('deleteCategory', () => {
        it('should delete category', async () => {
            mockRepo.delete.mockResolvedValue(undefined);

            await service.deleteCategory(ORG_ID, 'cat-1');

            expect(mockRepo.delete).toHaveBeenCalledWith(ORG_ID, 'cat-1');
        });
    });
});
