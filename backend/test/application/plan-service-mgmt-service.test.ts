import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/observability', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), addContext: vi.fn() },
    tracer: { captureAWSv3Client: (c: any) => c },
    metrics: { addMetric: vi.fn() },
}));

import { PlanServiceMgmtService } from '../../src/application/plan-service-mgmt-service';
import { AppError } from '../../src/lib/error';

const mockRepo = {
    create: vi.fn(),
    get: vi.fn(),
    listByPlanId: vi.fn(),
    delete: vi.fn(),
};

const mockPublisher = { publish: vi.fn() };

const ORG_ID = 'org-test-123';

describe('PlanServiceMgmtService', () => {
    let service: PlanServiceMgmtService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new PlanServiceMgmtService(mockRepo as any, mockPublisher as any);
    });

    describe('createPlanService', () => {
        it('should create plan service, publish PlanServiceAdded event, and record metric', async () => {
            const request = {
                planId: 'plan-1',
                serviceTypeId: 'svc-type-1',
                includedVisits: 4,
                frequency: 'quarterly',
            };

            const created = {
                organizationId: ORG_ID,
                planId: 'plan-1',
                serviceTypeId: 'svc-type-1',
                includedVisits: 4,
                frequency: 'quarterly',
                createdAt: '2024-01-01T00:00:00.000Z',
            };

            mockRepo.create.mockResolvedValue(created);
            mockPublisher.publish.mockResolvedValue(undefined);

            const { metrics } = await import('../../src/lib/observability');

            const result = await service.createPlanService(ORG_ID, request as any);

            expect(result).toEqual(created);
            expect(mockRepo.create).toHaveBeenCalledOnce();
            expect(mockPublisher.publish).toHaveBeenCalledWith('PlanServiceAdded', expect.objectContaining({
                organizationId: ORG_ID,
                planId: 'plan-1',
                serviceTypeId: 'svc-type-1',
            }));
            expect(metrics.addMetric).toHaveBeenCalledWith('PlanServicesCreated', expect.any(String), 1);
        });

        it('should populate createdAt on plan service', async () => {
            const request = {
                planId: 'plan-2',
                serviceTypeId: 'svc-type-2',
                includedVisits: 12,
                frequency: 'monthly',
            };

            mockRepo.create.mockImplementation(async (ps: any) => ps);
            mockPublisher.publish.mockResolvedValue(undefined);

            const result = await service.createPlanService(ORG_ID, request as any);

            expect(result.createdAt).toEqual(expect.any(String));
        });
    });

    describe('getPlanService', () => {
        it('should return plan service when found', async () => {
            const planService = { organizationId: ORG_ID, planId: 'plan-1', serviceTypeId: 'svc-type-1', includedVisits: 4 };
            mockRepo.get.mockResolvedValue(planService);

            const result = await service.getPlanService(ORG_ID, 'plan-1', 'svc-type-1');

            expect(result).toEqual(planService);
            expect(mockRepo.get).toHaveBeenCalledWith(ORG_ID, 'plan-1', 'svc-type-1');
        });

        it('should throw AppError 404 when plan service not found', async () => {
            mockRepo.get.mockResolvedValue(null);

            await expect(service.getPlanService(ORG_ID, 'plan-1', 'missing')).rejects.toThrow(AppError);
            await expect(service.getPlanService(ORG_ID, 'plan-1', 'missing')).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    describe('listPlanServices', () => {
        it('should delegate to repo.listByPlanId', async () => {
            const paginated = { items: [{ organizationId: ORG_ID, planId: 'plan-1', serviceTypeId: 'svc-type-1' }], count: 1 };
            mockRepo.listByPlanId.mockResolvedValue(paginated);

            const result = await service.listPlanServices(ORG_ID, 'plan-1', { limit: 10 });

            expect(result).toEqual(paginated);
            expect(mockRepo.listByPlanId).toHaveBeenCalledWith(ORG_ID, 'plan-1', { limit: 10 });
        });
    });

    describe('deletePlanService', () => {
        it('should delete plan service and publish PlanServiceRemoved event', async () => {
            mockRepo.delete.mockResolvedValue(undefined);
            mockPublisher.publish.mockResolvedValue(undefined);

            await service.deletePlanService(ORG_ID, 'plan-1', 'svc-type-1');

            expect(mockRepo.delete).toHaveBeenCalledWith(ORG_ID, 'plan-1', 'svc-type-1');
            expect(mockPublisher.publish).toHaveBeenCalledWith('PlanServiceRemoved', expect.objectContaining({
                organizationId: ORG_ID,
                planId: 'plan-1',
                serviceTypeId: 'svc-type-1',
            }));
        });
    });
});
