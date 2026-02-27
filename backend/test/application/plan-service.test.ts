import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/observability', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), addContext: vi.fn() },
    tracer: { captureAWSv3Client: (c: any) => c },
    metrics: { addMetric: vi.fn() },
}));

import { PlanAppService } from '../../src/application/plan-service';
import { AppError } from '../../src/lib/error';

const mockRepo = {
    create: vi.fn(),
    get: vi.fn(),
    list: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
};

const mockPublisher = { publish: vi.fn() };

const ORG_ID = 'org-test-123';

describe('PlanAppService', () => {
    let service: PlanAppService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new PlanAppService(mockRepo as any, mockPublisher as any);
    });

    describe('createPlan', () => {
        it('should create plan with default active status, publish PlanCreated event, and record metric', async () => {
            const request = {
                name: 'Basic Plan',
                description: 'Includes basic services',
                monthlyPrice: 9900,
                annualPrice: 99000,
            };

            const created = {
                organizationId: ORG_ID,
                planId: 'plan-1',
                ...request,
                status: 'active',
                createdAt: '2024-01-01T00:00:00.000Z',
            };

            mockRepo.create.mockResolvedValue(created);
            mockPublisher.publish.mockResolvedValue(undefined);

            const { metrics } = await import('../../src/lib/observability');

            const result = await service.createPlan(ORG_ID, request as any);

            expect(result).toEqual(created);
            expect(mockRepo.create).toHaveBeenCalledOnce();
            expect(mockPublisher.publish).toHaveBeenCalledWith('PlanCreated', expect.objectContaining({
                organizationId: ORG_ID,
                planId: created.planId,
            }));
            expect(metrics.addMetric).toHaveBeenCalledWith('PlansCreated', expect.any(String), 1);
        });

        it('should use provided status if given', async () => {
            const request = {
                name: 'Premium Plan',
                description: 'All-inclusive',
                monthlyPrice: 19900,
                annualPrice: 199000,
                status: 'inactive' as const,
            };

            mockRepo.create.mockImplementation(async (p: any) => p);
            mockPublisher.publish.mockResolvedValue(undefined);

            const result = await service.createPlan(ORG_ID, request);

            expect(result.status).toBe('inactive');
        });

        it('should default to active status when status not provided', async () => {
            const request = {
                name: 'Standard Plan',
                description: 'Mid tier',
                monthlyPrice: 14900,
                annualPrice: 149000,
            };

            mockRepo.create.mockImplementation(async (p: any) => p);
            mockPublisher.publish.mockResolvedValue(undefined);

            const result = await service.createPlan(ORG_ID, request as any);

            expect(result.status).toBe('active');
        });
    });

    describe('getPlan', () => {
        it('should return plan when found', async () => {
            const plan = { organizationId: ORG_ID, planId: 'plan-1', name: 'Basic Plan', status: 'active' };
            mockRepo.get.mockResolvedValue(plan);

            const result = await service.getPlan(ORG_ID, 'plan-1');

            expect(result).toEqual(plan);
            expect(mockRepo.get).toHaveBeenCalledWith(ORG_ID, 'plan-1');
        });

        it('should throw AppError 404 when plan not found', async () => {
            mockRepo.get.mockResolvedValue(null);

            await expect(service.getPlan(ORG_ID, 'missing')).rejects.toThrow(AppError);
            await expect(service.getPlan(ORG_ID, 'missing')).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    describe('listPlans', () => {
        it('should delegate to repo.list', async () => {
            const paginated = { items: [{ organizationId: ORG_ID, planId: 'plan-1' }], count: 1 };
            mockRepo.list.mockResolvedValue(paginated);

            const result = await service.listPlans(ORG_ID, { limit: 5 });

            expect(result).toEqual(paginated);
            expect(mockRepo.list).toHaveBeenCalledWith(ORG_ID, { limit: 5 });
        });
    });

    describe('updatePlan', () => {
        it('should update plan and return updated plan without publishing event', async () => {
            const existing = { organizationId: ORG_ID, planId: 'plan-1', name: 'Basic Plan', status: 'active' };
            const updated = { organizationId: ORG_ID, planId: 'plan-1', name: 'Basic Plan v2', status: 'active' };
            mockRepo.get.mockResolvedValue(existing);
            mockRepo.update.mockResolvedValue(updated);

            const result = await service.updatePlan(ORG_ID, 'plan-1', { name: 'Basic Plan v2' });

            expect(result).toEqual(updated);
            expect(mockPublisher.publish).not.toHaveBeenCalled();
        });

        it('should throw 404 if plan not found', async () => {
            mockRepo.get.mockResolvedValue(null);

            await expect(service.updatePlan(ORG_ID, 'missing', { name: 'x' })).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    describe('deletePlan', () => {
        it('should delete plan without publishing event', async () => {
            mockRepo.delete.mockResolvedValue(undefined);

            await service.deletePlan(ORG_ID, 'plan-1');

            expect(mockRepo.delete).toHaveBeenCalledWith(ORG_ID, 'plan-1');
            expect(mockPublisher.publish).not.toHaveBeenCalled();
        });
    });
});
