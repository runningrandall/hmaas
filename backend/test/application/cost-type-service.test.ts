import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/observability', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), addContext: vi.fn() },
    tracer: { captureAWSv3Client: (c: any) => c },
    metrics: { addMetric: vi.fn() },
}));

import { CostTypeService } from '../../src/application/cost-type-service';
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

describe('CostTypeService', () => {
    let service: CostTypeService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new CostTypeService(mockRepo as any, mockPublisher as any);
    });

    describe('createCostType', () => {
        it('should create cost type, record metric, and return created without publishing event', async () => {
            const request = {
                name: 'Labor',
                description: 'Employee labor costs',
            };

            const created = {
                organizationId: ORG_ID,
                costTypeId: 'ct-1',
                ...request,
                createdAt: '2024-01-01T00:00:00.000Z',
            };

            mockRepo.create.mockResolvedValue(created);

            const { metrics } = await import('../../src/lib/observability');

            const result = await service.createCostType(ORG_ID, request);

            expect(result).toEqual(created);
            expect(mockRepo.create).toHaveBeenCalledOnce();
            expect(metrics.addMetric).toHaveBeenCalledWith('CostTypesCreated', expect.any(String), 1);
            expect(mockPublisher.publish).not.toHaveBeenCalled();
        });

        it('should populate costTypeId and createdAt', async () => {
            const request = {
                name: 'Materials',
                description: 'Material costs',
            };

            mockRepo.create.mockImplementation(async (ct: any) => ct);

            const result = await service.createCostType(ORG_ID, request);

            expect(result.costTypeId).toEqual(expect.any(String));
            expect(result.createdAt).toEqual(expect.any(String));
        });
    });

    describe('getCostType', () => {
        it('should return cost type when found', async () => {
            const costType = { organizationId: ORG_ID, costTypeId: 'ct-1', name: 'Labor', description: 'Employee labor costs' };
            mockRepo.get.mockResolvedValue(costType);

            const result = await service.getCostType(ORG_ID, 'ct-1');

            expect(result).toEqual(costType);
            expect(mockRepo.get).toHaveBeenCalledWith(ORG_ID, 'ct-1');
        });

        it('should throw AppError 404 when cost type not found', async () => {
            mockRepo.get.mockResolvedValue(null);

            await expect(service.getCostType(ORG_ID, 'missing')).rejects.toThrow(AppError);
            await expect(service.getCostType(ORG_ID, 'missing')).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    describe('listCostTypes', () => {
        it('should delegate to repo.list', async () => {
            const paginated = { items: [{ organizationId: ORG_ID, costTypeId: 'ct-1' }], count: 1 };
            mockRepo.list.mockResolvedValue(paginated);

            const result = await service.listCostTypes(ORG_ID, { limit: 10 });

            expect(result).toEqual(paginated);
            expect(mockRepo.list).toHaveBeenCalledWith(ORG_ID, { limit: 10 });
        });
    });

    describe('updateCostType', () => {
        it('should update cost type and return updated without publishing event', async () => {
            const existing = { organizationId: ORG_ID, costTypeId: 'ct-1', name: 'Labor', description: 'Employee labor costs' };
            const updated = { organizationId: ORG_ID, costTypeId: 'ct-1', name: 'Labor Updated', description: 'Updated description' };
            mockRepo.get.mockResolvedValue(existing);
            mockRepo.update.mockResolvedValue(updated);

            const result = await service.updateCostType(ORG_ID, 'ct-1', { name: 'Labor Updated', description: 'Updated description' });

            expect(result).toEqual(updated);
            expect(mockPublisher.publish).not.toHaveBeenCalled();
        });

        it('should throw 404 if cost type not found', async () => {
            mockRepo.get.mockResolvedValue(null);

            await expect(service.updateCostType(ORG_ID, 'missing', { name: 'x' })).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    describe('deleteCostType', () => {
        it('should delete cost type without publishing event', async () => {
            mockRepo.delete.mockResolvedValue(undefined);

            await service.deleteCostType(ORG_ID, 'ct-1');

            expect(mockRepo.delete).toHaveBeenCalledWith(ORG_ID, 'ct-1');
            expect(mockPublisher.publish).not.toHaveBeenCalled();
        });
    });
});
