import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/observability', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    tracer: { captureAWSv3Client: (c: any) => c },
    metrics: { addMetric: vi.fn() },
}));

vi.mock('../../src/entities/service', () => ({
    DBService: {
        entities: {
            costType: {
                create: vi.fn(),
                get: vi.fn(),
                query: {
                    byCostTypeId: vi.fn(),
                },
                patch: vi.fn(),
                delete: vi.fn(),
            },
        },
    },
}));

import { DynamoCostTypeRepository } from '../../src/adapters/dynamo-cost-type-repository';
import { DBService } from '../../src/entities/service';

const mockCostType = {
    organizationId: 'org-test-123',
    costTypeId: 'ct-1',
    name: 'Labor',
    description: 'Labor costs',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
};

describe('DynamoCostTypeRepository', () => {
    let repo: DynamoCostTypeRepository;
    const mockEntity = (DBService.entities.costType as any);

    beforeEach(() => {
        vi.clearAllMocks();
        repo = new DynamoCostTypeRepository();
    });

    describe('create', () => {
        it('should create a cost type and return the parsed result', async () => {
            mockEntity.create.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: mockCostType }) });

            const result = await repo.create(mockCostType);

            expect(result.costTypeId).toBe('ct-1');
            expect(result.name).toBe('Labor');
        });

        it('should throw Data integrity error when create returns invalid data', async () => {
            mockEntity.create.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: { costTypeId: 'ct-1' } }) });

            await expect(repo.create(mockCostType)).rejects.toThrow('Data integrity error');
        });
    });

    describe('get', () => {
        it('should return a parsed cost type when found', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: mockCostType }) });

            const result = await repo.get('org-test-123', 'ct-1');

            expect(result).not.toBeNull();
            expect(result!.costTypeId).toBe('ct-1');
        });

        it('should return null when cost type not found', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: null }) });

            const result = await repo.get('org-test-123', 'ct-1');

            expect(result).toBeNull();
        });

        it('should throw Data integrity error when get returns invalid data', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: { badField: true } }) });

            await expect(repo.get('org-test-123', 'ct-1')).rejects.toThrow('Data integrity error');
        });
    });

    describe('list', () => {
        it('should return paginated list of cost types', async () => {
            mockEntity.query.byCostTypeId.mockReturnValue({
                go: vi.fn().mockResolvedValue({ data: [mockCostType], cursor: null }),
            });

            const result = await repo.list('org-test-123');

            expect(result.items).toHaveLength(1);
            expect(result.items[0].costTypeId).toBe('ct-1');
            expect(result.cursor).toBeNull();
        });

        it('should pass limit and cursor options', async () => {
            const mockGo = vi.fn().mockResolvedValue({ data: [mockCostType], cursor: 'next-page' });
            mockEntity.query.byCostTypeId.mockReturnValue({ go: mockGo });

            const result = await repo.list('org-test-123', { limit: 5, cursor: 'some-cursor' });

            expect(mockEntity.query.byCostTypeId).toHaveBeenCalledWith({ organizationId: 'org-test-123' });
            expect(mockGo).toHaveBeenCalledWith({ limit: 5, cursor: 'some-cursor' });
            expect(result.cursor).toBe('next-page');
        });

        it('should use default page size when no options provided', async () => {
            const mockGo = vi.fn().mockResolvedValue({ data: [], cursor: null });
            mockEntity.query.byCostTypeId.mockReturnValue({ go: mockGo });

            await repo.list('org-test-123');

            expect(mockGo).toHaveBeenCalledWith({ limit: 20 });
        });
    });

    describe('update', () => {
        it('should update a cost type and return the parsed result', async () => {
            const updated = { ...mockCostType, name: 'Materials' };
            mockEntity.patch.mockReturnValue({
                set: vi.fn().mockReturnValue({ go: vi.fn().mockResolvedValue({ data: updated }) }),
            });

            const result = await repo.update('org-test-123', 'ct-1', { name: 'Materials' });

            expect(result.name).toBe('Materials');
        });

        it('should throw Data integrity error when update returns invalid data', async () => {
            mockEntity.patch.mockReturnValue({
                set: vi.fn().mockReturnValue({ go: vi.fn().mockResolvedValue({ data: { badField: true } }) }),
            });

            await expect(repo.update('org-test-123', 'ct-1', { name: 'Materials' })).rejects.toThrow('Data integrity error');
        });
    });

    describe('delete', () => {
        it('should delete a cost type', async () => {
            mockEntity.delete.mockReturnValue({ go: vi.fn().mockResolvedValue({}) });

            await expect(repo.delete('org-test-123', 'ct-1')).resolves.toBeUndefined();
            expect(mockEntity.delete).toHaveBeenCalledWith({ organizationId: 'org-test-123', costTypeId: 'ct-1' });
        });
    });
});
