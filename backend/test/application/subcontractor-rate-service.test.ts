import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/observability', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), addContext: vi.fn() },
    tracer: { captureAWSv3Client: (c: any) => c },
    metrics: { addMetric: vi.fn() },
}));

import { SubcontractorRateService } from '../../src/application/subcontractor-rate-service';
import { AppError } from '../../src/lib/error';

const mockRepo = {
    create: vi.fn(),
    get: vi.fn(),
    listBySubcontractorId: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
};

const mockPublisher = { publish: vi.fn() };

const ORG_ID = 'org-test-123';

describe('SubcontractorRateService', () => {
    let service: SubcontractorRateService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new SubcontractorRateService(mockRepo as any, mockPublisher as any);
    });

    describe('createRate', () => {
        it('should create rate and publish event', async () => {
            const request = {
                propertyId: 'prop-1',
                serviceTypeId: 'svc-type-1',
                rate: 7500,
                unit: 'per_visit',
            };

            const created = {
                organizationId: ORG_ID,
                subcontractorRateId: 'rate-1',
                subcontractorId: 'sub-1',
                ...request,
                createdAt: '2026-01-01T00:00:00.000Z',
            };

            mockRepo.create.mockResolvedValue(created);
            mockPublisher.publish.mockResolvedValue(undefined);

            const { metrics } = await import('../../src/lib/observability');

            const result = await service.createRate(ORG_ID, 'sub-1', request);

            expect(result).toEqual(created);
            expect(mockRepo.create).toHaveBeenCalledOnce();
            expect(mockPublisher.publish).toHaveBeenCalledWith('SubcontractorRateCreated', expect.objectContaining({
                organizationId: ORG_ID,
                subcontractorRateId: created.subcontractorRateId,
                subcontractorId: 'sub-1',
                propertyId: 'prop-1',
                serviceTypeId: 'svc-type-1',
            }));
            expect(metrics.addMetric).toHaveBeenCalledWith('SubcontractorRatesCreated', expect.any(String), 1);
        });
    });

    describe('getRate', () => {
        it('should return rate when found', async () => {
            const rate = { organizationId: ORG_ID, subcontractorRateId: 'rate-1', rate: 7500 };
            mockRepo.get.mockResolvedValue(rate);

            const result = await service.getRate(ORG_ID, 'rate-1');

            expect(result).toEqual(rate);
        });

        it('should throw AppError 404 when not found', async () => {
            mockRepo.get.mockResolvedValue(null);

            await expect(service.getRate(ORG_ID, 'missing')).rejects.toThrow(AppError);
            await expect(service.getRate(ORG_ID, 'missing')).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    describe('listRatesBySubcontractor', () => {
        it('should delegate to repo.listBySubcontractorId', async () => {
            const paginated = { items: [{ subcontractorRateId: 'rate-1' }], cursor: null };
            mockRepo.listBySubcontractorId.mockResolvedValue(paginated);

            const result = await service.listRatesBySubcontractor(ORG_ID, 'sub-1', { limit: 10 });

            expect(result).toEqual(paginated);
            expect(mockRepo.listBySubcontractorId).toHaveBeenCalledWith(ORG_ID, 'sub-1', { limit: 10 });
        });
    });

    describe('updateRate', () => {
        it('should update rate and return updated', async () => {
            const existing = { organizationId: ORG_ID, subcontractorRateId: 'rate-1', rate: 7500 };
            const updated = { ...existing, rate: 8000 };
            mockRepo.get.mockResolvedValue(existing);
            mockRepo.update.mockResolvedValue(updated);

            const result = await service.updateRate(ORG_ID, 'rate-1', { rate: 8000 });

            expect(result).toEqual(updated);
        });

        it('should throw 404 if not found', async () => {
            mockRepo.get.mockResolvedValue(null);

            await expect(service.updateRate(ORG_ID, 'missing', { rate: 5000 })).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    describe('deleteRate', () => {
        it('should delete rate', async () => {
            mockRepo.delete.mockResolvedValue(undefined);

            await service.deleteRate(ORG_ID, 'rate-1');

            expect(mockRepo.delete).toHaveBeenCalledWith(ORG_ID, 'rate-1');
        });
    });
});
