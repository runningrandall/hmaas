import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/observability', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    tracer: { captureAWSv3Client: (c: any) => c },
    metrics: { addMetric: vi.fn() },
}));

vi.mock('../../src/entities/service', () => ({
    DBService: {
        entities: {
            cost: {
                create: vi.fn(),
                get: vi.fn(),
                query: {
                    byServiceId: vi.fn(),
                },
                delete: vi.fn(),
            },
        },
    },
}));

import { DynamoCostRepository } from '../../src/adapters/dynamo-cost-repository';
import { DBService } from '../../src/entities/service';

const mockCost = {
    costId: 'cost-1',
    serviceId: 'svc-1',
    costTypeId: 'ct-1',
    amount: 5000,
    description: 'Monthly labor cost',
    effectiveDate: '2024-01-01',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
};

describe('DynamoCostRepository', () => {
    let repo: DynamoCostRepository;
    const mockEntity = (DBService.entities.cost as any);

    beforeEach(() => {
        vi.clearAllMocks();
        repo = new DynamoCostRepository();
    });

    describe('create', () => {
        it('should create a cost and return the parsed result', async () => {
            mockEntity.create.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: mockCost }) });

            const result = await repo.create(mockCost);

            expect(result.costId).toBe('cost-1');
            expect(result.amount).toBe(5000);
        });

        it('should throw Data integrity error when create returns invalid data', async () => {
            mockEntity.create.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: { costId: 'cost-1' } }) });

            await expect(repo.create(mockCost)).rejects.toThrow('Data integrity error');
        });
    });

    describe('get', () => {
        it('should return a parsed cost when found', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: mockCost }) });

            const result = await repo.get('cost-1');

            expect(result).not.toBeNull();
            expect(result!.costId).toBe('cost-1');
        });

        it('should return null when cost not found', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: null }) });

            const result = await repo.get('cost-1');

            expect(result).toBeNull();
        });

        it('should throw Data integrity error when get returns invalid data', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: { badField: true } }) });

            await expect(repo.get('cost-1')).rejects.toThrow('Data integrity error');
        });
    });

    describe('listByServiceId', () => {
        it('should return paginated list of costs for a service', async () => {
            mockEntity.query.byServiceId.mockReturnValue({
                go: vi.fn().mockResolvedValue({ data: [mockCost], cursor: null }),
            });

            const result = await repo.listByServiceId('svc-1');

            expect(result.items).toHaveLength(1);
            expect(result.items[0].costId).toBe('cost-1');
            expect(result.cursor).toBeNull();
        });

        it('should pass limit and cursor options', async () => {
            const mockGo = vi.fn().mockResolvedValue({ data: [mockCost], cursor: 'next-page' });
            mockEntity.query.byServiceId.mockReturnValue({ go: mockGo });

            const result = await repo.listByServiceId('svc-1', { limit: 5, cursor: 'some-cursor' });

            expect(mockEntity.query.byServiceId).toHaveBeenCalledWith({ serviceId: 'svc-1' });
            expect(mockGo).toHaveBeenCalledWith({ limit: 5, cursor: 'some-cursor' });
            expect(result.cursor).toBe('next-page');
        });

        it('should use default page size when no options provided', async () => {
            const mockGo = vi.fn().mockResolvedValue({ data: [], cursor: null });
            mockEntity.query.byServiceId.mockReturnValue({ go: mockGo });

            await repo.listByServiceId('svc-1');

            expect(mockGo).toHaveBeenCalledWith({ limit: 20 });
        });
    });

    describe('delete', () => {
        it('should delete a cost', async () => {
            mockEntity.delete.mockReturnValue({ go: vi.fn().mockResolvedValue({}) });

            await expect(repo.delete('cost-1')).resolves.toBeUndefined();
            expect(mockEntity.delete).toHaveBeenCalledWith({ costId: 'cost-1' });
        });
    });
});
