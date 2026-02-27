import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/observability', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    tracer: { captureAWSv3Client: (c: any) => c },
    metrics: { addMetric: vi.fn() },
}));

vi.mock('../../src/entities/service', () => ({
    DBService: {
        entities: {
            plan: {
                create: vi.fn(),
                get: vi.fn(),
                query: {
                    byOrgPlans: vi.fn(),
                },
                patch: vi.fn(),
                delete: vi.fn(),
            },
        },
    },
}));

import { DynamoPlanRepository } from '../../src/adapters/dynamo-plan-repository';
import { DBService } from '../../src/entities/service';

const mockPlan = {
    organizationId: 'org-test-123',
    planId: 'plan-1',
    name: 'Basic Bundle',
    description: 'Basic property management bundle',
    monthlyPrice: 9900,
    annualPrice: 99000,
    status: 'active' as const,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
};

describe('DynamoPlanRepository', () => {
    let repo: DynamoPlanRepository;
    const mockEntity = (DBService.entities.plan as any);

    beforeEach(() => {
        vi.clearAllMocks();
        repo = new DynamoPlanRepository();
    });

    describe('create', () => {
        it('should create a plan and return the parsed result', async () => {
            mockEntity.create.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: mockPlan }) });

            const result = await repo.create(mockPlan);

            expect(result.planId).toBe('plan-1');
            expect(result.name).toBe('Basic Bundle');
            expect(result.monthlyPrice).toBe(9900);
        });

        it('should throw Data integrity error when create returns invalid data', async () => {
            mockEntity.create.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: { planId: 'plan-1' } }) });

            await expect(repo.create(mockPlan)).rejects.toThrow('Data integrity error');
        });
    });

    describe('get', () => {
        it('should return a parsed plan when found', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: mockPlan }) });

            const result = await repo.get('org-test-123', 'plan-1');

            expect(result).not.toBeNull();
            expect(result!.planId).toBe('plan-1');
        });

        it('should return null when plan not found', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: null }) });

            const result = await repo.get('org-test-123', 'plan-1');

            expect(result).toBeNull();
        });

        it('should throw Data integrity error when get returns invalid data', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: { badField: true } }) });

            await expect(repo.get('org-test-123', 'plan-1')).rejects.toThrow('Data integrity error');
        });
    });

    describe('list', () => {
        it('should return paginated list of plans', async () => {
            mockEntity.query.byOrgPlans.mockReturnValue({
                go: vi.fn().mockResolvedValue({ data: [mockPlan], cursor: null }),
            });

            const result = await repo.list('org-test-123');

            expect(result.items).toHaveLength(1);
            expect(result.items[0].planId).toBe('plan-1');
            expect(result.cursor).toBeNull();
        });

        it('should pass limit and cursor options', async () => {
            const mockGo = vi.fn().mockResolvedValue({ data: [mockPlan], cursor: 'next-page' });
            mockEntity.query.byOrgPlans.mockReturnValue({ go: mockGo });

            const result = await repo.list('org-test-123', { limit: 5, cursor: 'some-cursor' });

            expect(mockEntity.query.byOrgPlans).toHaveBeenCalledWith({ organizationId: 'org-test-123' });
            expect(mockGo).toHaveBeenCalledWith({ limit: 5, cursor: 'some-cursor' });
            expect(result.cursor).toBe('next-page');
        });

        it('should use default page size when no options provided', async () => {
            const mockGo = vi.fn().mockResolvedValue({ data: [], cursor: null });
            mockEntity.query.byOrgPlans.mockReturnValue({ go: mockGo });

            await repo.list('org-test-123');

            expect(mockGo).toHaveBeenCalledWith({ limit: 20 });
        });
    });

    describe('update', () => {
        it('should update a plan and return the parsed result', async () => {
            const updated = { ...mockPlan, name: 'Premium Bundle' };
            mockEntity.patch.mockReturnValue({
                set: vi.fn().mockReturnValue({ go: vi.fn().mockResolvedValue({ data: updated }) }),
            });

            const result = await repo.update('org-test-123', 'plan-1', { name: 'Premium Bundle' });

            expect(result.name).toBe('Premium Bundle');
        });

        it('should throw Data integrity error when update returns invalid data', async () => {
            mockEntity.patch.mockReturnValue({
                set: vi.fn().mockReturnValue({ go: vi.fn().mockResolvedValue({ data: { badField: true } }) }),
            });

            await expect(repo.update('org-test-123', 'plan-1', { name: 'Premium Bundle' })).rejects.toThrow('Data integrity error');
        });
    });

    describe('delete', () => {
        it('should delete a plan', async () => {
            mockEntity.delete.mockReturnValue({ go: vi.fn().mockResolvedValue({}) });

            await expect(repo.delete('org-test-123', 'plan-1')).resolves.toBeUndefined();
            expect(mockEntity.delete).toHaveBeenCalledWith({ organizationId: 'org-test-123', planId: 'plan-1' });
        });
    });
});
