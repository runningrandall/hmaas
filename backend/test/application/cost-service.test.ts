import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/observability', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), addContext: vi.fn() },
    tracer: { captureAWSv3Client: (c: any) => c },
    metrics: { addMetric: vi.fn() },
}));

import { CostService } from '../../src/application/cost-service';
import { AppError } from '../../src/lib/error';

const mockRepo = {
    create: vi.fn(),
    get: vi.fn(),
    listByServiceId: vi.fn(),
    delete: vi.fn(),
};

const mockPublisher = { publish: vi.fn() };

const ORG_ID = 'org-test-123';

describe('CostService', () => {
    let service: CostService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new CostService(mockRepo as any, mockPublisher as any);
    });

    describe('createCost', () => {
        it('should create cost, publish CostAdded event, and record metric', async () => {
            const request = {
                serviceId: 'svc-1',
                costTypeId: 'ct-1',
                amount: 5000,
                description: 'Lawn service cost',
                effectiveDate: '2024-01-01',
            };

            const created = {
                organizationId: ORG_ID,
                costId: 'cost-1',
                ...request,
                createdAt: '2024-01-01T00:00:00.000Z',
            };

            mockRepo.create.mockResolvedValue(created);
            mockPublisher.publish.mockResolvedValue(undefined);

            const { metrics } = await import('../../src/lib/observability');

            const result = await service.createCost(ORG_ID, request as any);

            expect(result).toEqual(created);
            expect(mockRepo.create).toHaveBeenCalledOnce();
            expect(mockPublisher.publish).toHaveBeenCalledWith('CostAdded', expect.objectContaining({
                organizationId: ORG_ID,
                costId: created.costId,
                serviceId: request.serviceId,
                amount: request.amount,
            }));
            expect(metrics.addMetric).toHaveBeenCalledWith('CostsCreated', expect.any(String), 1);
        });

        it('should populate costId and createdAt', async () => {
            const request = {
                serviceId: 'svc-2',
                costTypeId: 'ct-2',
                amount: 1200,
                description: 'Pest control',
                effectiveDate: '2024-03-01',
            };

            mockRepo.create.mockImplementation(async (c: any) => c);
            mockPublisher.publish.mockResolvedValue(undefined);

            const result = await service.createCost(ORG_ID, request as any);

            expect(result.costId).toEqual(expect.any(String));
            expect(result.createdAt).toEqual(expect.any(String));
        });
    });

    describe('getCost', () => {
        it('should return cost when found', async () => {
            const cost = { organizationId: ORG_ID, costId: 'cost-1', serviceId: 'svc-1', amount: 5000 };
            mockRepo.get.mockResolvedValue(cost);

            const result = await service.getCost(ORG_ID, 'cost-1');

            expect(result).toEqual(cost);
            expect(mockRepo.get).toHaveBeenCalledWith(ORG_ID, 'cost-1');
        });

        it('should throw AppError 404 when cost not found', async () => {
            mockRepo.get.mockResolvedValue(null);

            await expect(service.getCost(ORG_ID, 'missing')).rejects.toThrow(AppError);
            await expect(service.getCost(ORG_ID, 'missing')).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    describe('listCostsByService', () => {
        it('should delegate to repo.listByServiceId', async () => {
            const paginated = { items: [{ organizationId: ORG_ID, costId: 'cost-1', serviceId: 'svc-1' }], count: 1 };
            mockRepo.listByServiceId.mockResolvedValue(paginated);

            const result = await service.listCostsByService(ORG_ID, 'svc-1', { limit: 10 });

            expect(result).toEqual(paginated);
            expect(mockRepo.listByServiceId).toHaveBeenCalledWith(ORG_ID, 'svc-1', { limit: 10 });
        });
    });

    describe('deleteCost', () => {
        it('should fetch cost first to get serviceId, delete it, and publish CostRemoved event', async () => {
            const cost = { organizationId: ORG_ID, costId: 'cost-1', serviceId: 'svc-1', amount: 5000 };
            mockRepo.get.mockResolvedValue(cost);
            mockRepo.delete.mockResolvedValue(undefined);
            mockPublisher.publish.mockResolvedValue(undefined);

            await service.deleteCost(ORG_ID, 'cost-1');

            expect(mockRepo.get).toHaveBeenCalledWith(ORG_ID, 'cost-1');
            expect(mockRepo.delete).toHaveBeenCalledWith(ORG_ID, 'cost-1');
            expect(mockPublisher.publish).toHaveBeenCalledWith('CostRemoved', expect.objectContaining({
                organizationId: ORG_ID,
                costId: 'cost-1',
                serviceId: 'svc-1',
            }));
        });

        it('should throw 404 if cost not found before deleting', async () => {
            mockRepo.get.mockResolvedValue(null);

            await expect(service.deleteCost(ORG_ID, 'missing')).rejects.toMatchObject({ statusCode: 404 });
            expect(mockRepo.delete).not.toHaveBeenCalled();
        });
    });
});
