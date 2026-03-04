import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/observability', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    tracer: { captureAWSv3Client: (c: any) => c },
    metrics: { addMetric: vi.fn() },
}));

vi.mock('../../src/entities/service', () => ({
    DBService: {
        entities: {
            category: {
                create: vi.fn(),
                get: vi.fn(),
                query: {
                    byOrgCategories: vi.fn(),
                },
                patch: vi.fn(),
                delete: vi.fn(),
            },
        },
    },
}));

import { DynamoCategoryRepository } from '../../src/adapters/dynamo-category-repository';
import { DBService } from '../../src/entities/service';

const mockCategory = {
    organizationId: 'GLOBAL',
    categoryId: 'cat-1',
    name: 'Outdoor',
    description: 'Outdoor services',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
};

describe('DynamoCategoryRepository', () => {
    let repo: DynamoCategoryRepository;
    const mockEntity = (DBService.entities.category as any);

    beforeEach(() => {
        vi.clearAllMocks();
        repo = new DynamoCategoryRepository();
    });

    describe('create', () => {
        it('should create a category and return the parsed result', async () => {
            mockEntity.create.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: mockCategory }) });

            const result = await repo.create(mockCategory);

            expect(result.categoryId).toBe('cat-1');
            expect(result.name).toBe('Outdoor');
        });

        it('should throw Data integrity error when create returns invalid data', async () => {
            mockEntity.create.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: { categoryId: 'cat-1' } }) });

            await expect(repo.create(mockCategory)).rejects.toThrow('Data integrity error');
        });
    });

    describe('get', () => {
        it('should return a parsed category when found', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: mockCategory }) });

            const result = await repo.get('GLOBAL', 'cat-1');

            expect(result).not.toBeNull();
            expect(result!.categoryId).toBe('cat-1');
        });

        it('should return null when category not found', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: null }) });

            const result = await repo.get('GLOBAL', 'cat-1');

            expect(result).toBeNull();
        });

        it('should throw Data integrity error when get returns invalid data', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: { badField: true } }) });

            await expect(repo.get('GLOBAL', 'cat-1')).rejects.toThrow('Data integrity error');
        });
    });

    describe('list', () => {
        it('should return paginated list of categories', async () => {
            mockEntity.query.byOrgCategories.mockReturnValue({
                go: vi.fn().mockResolvedValue({ data: [mockCategory], cursor: null }),
            });

            const result = await repo.list('GLOBAL');

            expect(result.items).toHaveLength(1);
            expect(result.items[0].categoryId).toBe('cat-1');
            expect(result.cursor).toBeNull();
        });

        it('should pass limit and cursor options', async () => {
            const mockGo = vi.fn().mockResolvedValue({ data: [mockCategory], cursor: 'next-page' });
            mockEntity.query.byOrgCategories.mockReturnValue({ go: mockGo });

            const result = await repo.list('GLOBAL', { limit: 5, cursor: 'some-cursor' });

            expect(mockEntity.query.byOrgCategories).toHaveBeenCalledWith({ organizationId: 'GLOBAL' });
            expect(mockGo).toHaveBeenCalledWith({ limit: 5, cursor: 'some-cursor' });
            expect(result.cursor).toBe('next-page');
        });

        it('should use default page size when no options provided', async () => {
            const mockGo = vi.fn().mockResolvedValue({ data: [], cursor: null });
            mockEntity.query.byOrgCategories.mockReturnValue({ go: mockGo });

            await repo.list('GLOBAL');

            expect(mockGo).toHaveBeenCalledWith({ limit: 20 });
        });
    });

    describe('update', () => {
        it('should update a category and return the parsed result', async () => {
            const updated = { ...mockCategory, name: 'Indoor' };
            mockEntity.patch.mockReturnValue({
                set: vi.fn().mockReturnValue({ go: vi.fn().mockResolvedValue({ data: updated }) }),
            });

            const result = await repo.update('GLOBAL', 'cat-1', { name: 'Indoor' });

            expect(result.name).toBe('Indoor');
        });

        it('should throw Data integrity error when update returns invalid data', async () => {
            mockEntity.patch.mockReturnValue({
                set: vi.fn().mockReturnValue({ go: vi.fn().mockResolvedValue({ data: { badField: true } }) }),
            });

            await expect(repo.update('GLOBAL', 'cat-1', { name: 'Indoor' })).rejects.toThrow('Data integrity error');
        });
    });

    describe('delete', () => {
        it('should delete a category', async () => {
            mockEntity.delete.mockReturnValue({ go: vi.fn().mockResolvedValue({}) });

            await expect(repo.delete('GLOBAL', 'cat-1')).resolves.toBeUndefined();
            expect(mockEntity.delete).toHaveBeenCalledWith({ organizationId: 'GLOBAL', categoryId: 'cat-1' });
        });
    });
});
