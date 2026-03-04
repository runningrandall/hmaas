import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/observability', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    tracer: { captureAWSv3Client: (c: any) => c },
    metrics: { addMetric: vi.fn() },
}));

vi.mock('../../src/entities/service', () => ({
    DBService: {
        entities: {
            entityCategory: {
                create: vi.fn(),
                query: {
                    byEntityAndCategory: vi.fn(),
                    byCategoryId: vi.fn(),
                },
                delete: vi.fn(),
            },
        },
    },
}));

import { DynamoEntityCategoryRepository } from '../../src/adapters/dynamo-entity-category-repository';
import { DBService } from '../../src/entities/service';

const mockEc = {
    organizationId: 'GLOBAL',
    entityType: 'serviceType',
    entityId: 'st-1',
    categoryId: 'cat-1',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
};

describe('DynamoEntityCategoryRepository', () => {
    let repo: DynamoEntityCategoryRepository;
    const mockEntity = (DBService.entities.entityCategory as any);

    beforeEach(() => {
        vi.clearAllMocks();
        repo = new DynamoEntityCategoryRepository();
    });

    describe('create', () => {
        it('should create an entity category and return the parsed result', async () => {
            mockEntity.create.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: mockEc }) });

            const result = await repo.create(mockEc);

            expect(result.entityId).toBe('st-1');
            expect(result.categoryId).toBe('cat-1');
            expect(result.entityType).toBe('serviceType');
        });

        it('should throw Data integrity error when create returns invalid data', async () => {
            mockEntity.create.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: { entityId: 'st-1' } }) });

            await expect(repo.create(mockEc)).rejects.toThrow('Data integrity error');
        });
    });

    describe('listByEntity', () => {
        it('should return paginated list', async () => {
            mockEntity.query.byEntityAndCategory.mockReturnValue({
                go: vi.fn().mockResolvedValue({ data: [mockEc], cursor: null }),
            });

            const result = await repo.listByEntity('GLOBAL', 'serviceType', 'st-1');

            expect(result.items).toHaveLength(1);
            expect(result.cursor).toBeNull();
        });

        it('should pass limit and cursor options', async () => {
            const mockGo = vi.fn().mockResolvedValue({ data: [], cursor: 'next-page' });
            mockEntity.query.byEntityAndCategory.mockReturnValue({ go: mockGo });

            await repo.listByEntity('GLOBAL', 'serviceType', 'st-1', { limit: 5, cursor: 'some-cursor' });

            expect(mockGo).toHaveBeenCalledWith({ limit: 5, cursor: 'some-cursor' });
        });
    });

    describe('listByCategory', () => {
        it('should return paginated list by category', async () => {
            mockEntity.query.byCategoryId.mockReturnValue({
                go: vi.fn().mockResolvedValue({ data: [mockEc], cursor: null }),
            });

            const result = await repo.listByCategory('GLOBAL', 'serviceType', 'cat-1');

            expect(result.items).toHaveLength(1);
        });
    });

    describe('delete', () => {
        it('should delete an entity category', async () => {
            mockEntity.delete.mockReturnValue({ go: vi.fn().mockResolvedValue({}) });

            await expect(repo.delete('GLOBAL', 'serviceType', 'st-1', 'cat-1')).resolves.toBeUndefined();
            expect(mockEntity.delete).toHaveBeenCalledWith({
                organizationId: 'GLOBAL',
                entityType: 'serviceType',
                entityId: 'st-1',
                categoryId: 'cat-1',
            });
        });
    });
});
