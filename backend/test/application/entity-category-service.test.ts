import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/observability', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), addContext: vi.fn() },
    tracer: { captureAWSv3Client: (c: any) => c },
    metrics: { addMetric: vi.fn() },
}));

import { EntityCategoryService } from '../../src/application/entity-category-service';

const mockRepo = {
    create: vi.fn(),
    listByEntity: vi.fn(),
    listByCategory: vi.fn(),
    delete: vi.fn(),
};

const mockPublisher = { publish: vi.fn() };

const ORG_ID = 'GLOBAL';

describe('EntityCategoryService', () => {
    let service: EntityCategoryService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new EntityCategoryService(mockRepo as any, mockPublisher as any);
    });

    describe('createEntityCategory', () => {
        it('should create assignment, record metric, and return created', async () => {
            const request = { entityType: 'serviceType' as const, entityId: 'st-1', categoryId: 'cat-1' };
            const created = { organizationId: ORG_ID, ...request, createdAt: '2024-01-01T00:00:00.000Z' };
            mockRepo.create.mockResolvedValue(created);

            const { metrics } = await import('../../src/lib/observability');

            const result = await service.createEntityCategory(ORG_ID, request);

            expect(result).toEqual(created);
            expect(mockRepo.create).toHaveBeenCalledOnce();
            expect(metrics.addMetric).toHaveBeenCalledWith('EntityCategoriesCreated', expect.any(String), 1);
        });
    });

    describe('listByEntity', () => {
        it('should delegate to repo.listByEntity', async () => {
            const paginated = { items: [{ entityType: 'serviceType', entityId: 'st-1', categoryId: 'cat-1' }], cursor: null };
            mockRepo.listByEntity.mockResolvedValue(paginated);

            const result = await service.listByEntity(ORG_ID, 'serviceType', 'st-1', { limit: 10 });

            expect(result).toEqual(paginated);
            expect(mockRepo.listByEntity).toHaveBeenCalledWith(ORG_ID, 'serviceType', 'st-1', { limit: 10 });
        });
    });

    describe('listByCategory', () => {
        it('should delegate to repo.listByCategory', async () => {
            const paginated = { items: [{ entityType: 'serviceType', entityId: 'st-1', categoryId: 'cat-1' }], cursor: null };
            mockRepo.listByCategory.mockResolvedValue(paginated);

            const result = await service.listByCategory(ORG_ID, 'serviceType', 'cat-1', { limit: 10 });

            expect(result).toEqual(paginated);
            expect(mockRepo.listByCategory).toHaveBeenCalledWith(ORG_ID, 'serviceType', 'cat-1', { limit: 10 });
        });
    });

    describe('deleteEntityCategory', () => {
        it('should delete and log', async () => {
            mockRepo.delete.mockResolvedValue(undefined);

            await service.deleteEntityCategory(ORG_ID, 'serviceType', 'st-1', 'cat-1');

            expect(mockRepo.delete).toHaveBeenCalledWith(ORG_ID, 'serviceType', 'st-1', 'cat-1');
        });
    });
});
