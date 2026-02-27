import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/observability', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    tracer: { captureAWSv3Client: (c: any) => c },
    metrics: { addMetric: vi.fn() },
}));

vi.mock('../../src/entities/service', () => ({
    DBService: {
        entities: {
            planService: {
                create: vi.fn(),
                get: vi.fn(),
                query: {
                    byPlanAndServiceType: vi.fn(),
                },
                delete: vi.fn(),
            },
        },
    },
}));

import { DynamoPlanServiceRepository } from '../../src/adapters/dynamo-plan-service-repository';
import { DBService } from '../../src/entities/service';

const mockPlanService = {
    planId: 'plan-1',
    serviceTypeId: 'st-1',
    includedVisits: 12,
    frequency: 'monthly',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
};

describe('DynamoPlanServiceRepository', () => {
    let repo: DynamoPlanServiceRepository;
    const mockEntity = (DBService.entities.planService as any);

    beforeEach(() => {
        vi.clearAllMocks();
        repo = new DynamoPlanServiceRepository();
    });

    describe('create', () => {
        it('should create a plan service and return the parsed result', async () => {
            mockEntity.create.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: mockPlanService }) });

            const result = await repo.create(mockPlanService);

            expect(result.planId).toBe('plan-1');
            expect(result.serviceTypeId).toBe('st-1');
        });

        it('should throw Data integrity error when create returns invalid data', async () => {
            mockEntity.create.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: { planId: 'plan-1' } }) });

            await expect(repo.create(mockPlanService)).rejects.toThrow('Data integrity error');
        });
    });

    describe('get', () => {
        it('should return a parsed plan service when found', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: mockPlanService }) });

            const result = await repo.get('plan-1', 'st-1');

            expect(result).not.toBeNull();
            expect(result!.planId).toBe('plan-1');
            expect(result!.serviceTypeId).toBe('st-1');
        });

        it('should return null when plan service not found', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: null }) });

            const result = await repo.get('plan-1', 'st-1');

            expect(result).toBeNull();
        });

        it('should throw Data integrity error when get returns invalid data', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: { badField: true } }) });

            await expect(repo.get('plan-1', 'st-1')).rejects.toThrow('Data integrity error');
        });
    });

    describe('listByPlanId', () => {
        it('should return paginated list of plan services for a plan', async () => {
            mockEntity.query.byPlanAndServiceType.mockReturnValue({
                go: vi.fn().mockResolvedValue({ data: [mockPlanService], cursor: null }),
            });

            const result = await repo.listByPlanId('plan-1');

            expect(result.items).toHaveLength(1);
            expect(result.items[0].planId).toBe('plan-1');
            expect(result.cursor).toBeNull();
        });

        it('should pass limit and cursor options', async () => {
            const mockGo = vi.fn().mockResolvedValue({ data: [mockPlanService], cursor: 'next-page' });
            mockEntity.query.byPlanAndServiceType.mockReturnValue({ go: mockGo });

            const result = await repo.listByPlanId('plan-1', { limit: 5, cursor: 'some-cursor' });

            expect(mockEntity.query.byPlanAndServiceType).toHaveBeenCalledWith({ planId: 'plan-1' });
            expect(mockGo).toHaveBeenCalledWith({ limit: 5, cursor: 'some-cursor' });
            expect(result.cursor).toBe('next-page');
        });

        it('should use default page size when no options provided', async () => {
            const mockGo = vi.fn().mockResolvedValue({ data: [], cursor: null });
            mockEntity.query.byPlanAndServiceType.mockReturnValue({ go: mockGo });

            await repo.listByPlanId('plan-1');

            expect(mockGo).toHaveBeenCalledWith({ limit: 20 });
        });
    });

    describe('delete', () => {
        it('should delete a plan service by planId and serviceTypeId', async () => {
            mockEntity.delete.mockReturnValue({ go: vi.fn().mockResolvedValue({}) });

            await expect(repo.delete('plan-1', 'st-1')).resolves.toBeUndefined();
            expect(mockEntity.delete).toHaveBeenCalledWith({ planId: 'plan-1', serviceTypeId: 'st-1' });
        });
    });
});
