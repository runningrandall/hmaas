import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/observability', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), addContext: vi.fn() },
    tracer: { captureAWSv3Client: (c: any) => c },
    metrics: { addMetric: vi.fn() },
}));

import { PropertyServiceService } from '../../src/application/property-service-service';
import { AppError } from '../../src/lib/error';

const mockRepo = {
    create: vi.fn(),
    get: vi.fn(),
    listByPropertyId: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
};

const mockPublisher = { publish: vi.fn() };

describe('PropertyServiceService', () => {
    let service: PropertyServiceService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new PropertyServiceService(mockRepo as any, mockPublisher as any);
    });

    describe('createPropertyService', () => {
        it('should create property service with active status, publish PropertyServiceActivated event, and record metric', async () => {
            const request = {
                propertyId: 'prop-1',
                serviceTypeId: 'st-1',
                planId: 'plan-1',
                startDate: '2024-01-01',
                endDate: '2024-12-31',
                frequency: 'monthly',
            };

            const created = {
                serviceId: 'psvc-1',
                ...request,
                status: 'active',
                createdAt: '2024-01-01T00:00:00.000Z',
            };

            mockRepo.create.mockResolvedValue(created);
            mockPublisher.publish.mockResolvedValue(undefined);

            const { metrics } = await import('../../src/lib/observability');

            const result = await service.createPropertyService(request as any);

            expect(result).toEqual(created);
            expect(mockRepo.create).toHaveBeenCalledOnce();
            expect(mockPublisher.publish).toHaveBeenCalledWith('PropertyServiceActivated', {
                serviceId: created.serviceId,
                propertyId: request.propertyId,
                serviceTypeId: request.serviceTypeId,
            });
            expect(metrics.addMetric).toHaveBeenCalledWith('PropertyServicesCreated', expect.any(String), 1);
        });

        it('should set status to active and populate serviceId and createdAt', async () => {
            const request = {
                propertyId: 'prop-2',
                serviceTypeId: 'st-2',
                planId: 'plan-1',
                startDate: '2024-06-01',
                frequency: 'quarterly',
            };

            mockRepo.create.mockImplementation(async (ps: any) => ps);
            mockPublisher.publish.mockResolvedValue(undefined);

            const result = await service.createPropertyService(request as any);

            expect(result.status).toBe('active');
            expect(result.serviceId).toEqual(expect.any(String));
            expect(result.createdAt).toEqual(expect.any(String));
        });
    });

    describe('getPropertyService', () => {
        it('should return property service when found', async () => {
            const ps = { serviceId: 'psvc-1', propertyId: 'prop-1', serviceTypeId: 'st-1', status: 'active' };
            mockRepo.get.mockResolvedValue(ps);

            const result = await service.getPropertyService('psvc-1');

            expect(result).toEqual(ps);
            expect(mockRepo.get).toHaveBeenCalledWith('psvc-1');
        });

        it('should throw AppError 404 when property service not found', async () => {
            mockRepo.get.mockResolvedValue(null);

            await expect(service.getPropertyService('missing')).rejects.toThrow(AppError);
            await expect(service.getPropertyService('missing')).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    describe('listPropertyServicesByProperty', () => {
        it('should delegate to repo.listByPropertyId', async () => {
            const paginated = { items: [{ serviceId: 'psvc-1', propertyId: 'prop-1' }], count: 1 };
            mockRepo.listByPropertyId.mockResolvedValue(paginated);

            const result = await service.listPropertyServicesByProperty('prop-1', { limit: 10 });

            expect(result).toEqual(paginated);
            expect(mockRepo.listByPropertyId).toHaveBeenCalledWith('prop-1', { limit: 10 });
        });
    });

    describe('updatePropertyService', () => {
        it('should publish PropertyServiceCancelled when status changes to cancelled', async () => {
            const existing = { serviceId: 'psvc-1', propertyId: 'prop-1', serviceTypeId: 'st-1', status: 'active' };
            const updated = { serviceId: 'psvc-1', propertyId: 'prop-1', serviceTypeId: 'st-1', status: 'cancelled' };
            mockRepo.get.mockResolvedValue(existing);
            mockRepo.update.mockResolvedValue(updated);
            mockPublisher.publish.mockResolvedValue(undefined);

            const result = await service.updatePropertyService('psvc-1', { status: 'cancelled' });

            expect(result).toEqual(updated);
            expect(mockPublisher.publish).toHaveBeenCalledWith('PropertyServiceCancelled', {
                serviceId: 'psvc-1',
                propertyId: 'prop-1',
                serviceTypeId: 'st-1',
            });
        });

        it('should publish PropertyServiceActivated when status changes to active from non-active', async () => {
            const existing = { serviceId: 'psvc-1', propertyId: 'prop-1', serviceTypeId: 'st-1', status: 'suspended' };
            const updated = { serviceId: 'psvc-1', propertyId: 'prop-1', serviceTypeId: 'st-1', status: 'active' };
            mockRepo.get.mockResolvedValue(existing);
            mockRepo.update.mockResolvedValue(updated);
            mockPublisher.publish.mockResolvedValue(undefined);

            await service.updatePropertyService('psvc-1', { status: 'active' });

            expect(mockPublisher.publish).toHaveBeenCalledWith('PropertyServiceActivated', {
                serviceId: 'psvc-1',
                propertyId: 'prop-1',
                serviceTypeId: 'st-1',
            });
        });

        it('should not publish event when status does not change', async () => {
            const existing = { serviceId: 'psvc-1', propertyId: 'prop-1', serviceTypeId: 'st-1', status: 'active' };
            const updated = { serviceId: 'psvc-1', propertyId: 'prop-1', serviceTypeId: 'st-1', status: 'active', frequency: 'weekly' };
            mockRepo.get.mockResolvedValue(existing);
            mockRepo.update.mockResolvedValue(updated);
            mockPublisher.publish.mockResolvedValue(undefined);

            await service.updatePropertyService('psvc-1', { frequency: 'weekly' });

            expect(mockPublisher.publish).not.toHaveBeenCalled();
        });

        it('should not publish event when status stays active', async () => {
            const existing = { serviceId: 'psvc-1', propertyId: 'prop-1', serviceTypeId: 'st-1', status: 'active' };
            const updated = { serviceId: 'psvc-1', propertyId: 'prop-1', serviceTypeId: 'st-1', status: 'active' };
            mockRepo.get.mockResolvedValue(existing);
            mockRepo.update.mockResolvedValue(updated);

            await service.updatePropertyService('psvc-1', { status: 'active' });

            expect(mockPublisher.publish).not.toHaveBeenCalled();
        });

        it('should throw 404 if property service not found', async () => {
            mockRepo.get.mockResolvedValue(null);

            await expect(service.updatePropertyService('missing', { status: 'cancelled' })).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    describe('deletePropertyService', () => {
        it('should fetch service first, delete it, and always publish PropertyServiceCancelled', async () => {
            const existing = { serviceId: 'psvc-1', propertyId: 'prop-1', serviceTypeId: 'st-1', status: 'active' };
            mockRepo.get.mockResolvedValue(existing);
            mockRepo.delete.mockResolvedValue(undefined);
            mockPublisher.publish.mockResolvedValue(undefined);

            await service.deletePropertyService('psvc-1');

            expect(mockRepo.get).toHaveBeenCalledWith('psvc-1');
            expect(mockRepo.delete).toHaveBeenCalledWith('psvc-1');
            expect(mockPublisher.publish).toHaveBeenCalledWith('PropertyServiceCancelled', {
                serviceId: 'psvc-1',
                propertyId: 'prop-1',
                serviceTypeId: 'st-1',
            });
        });

        it('should throw 404 if property service not found before deleting', async () => {
            mockRepo.get.mockResolvedValue(null);

            await expect(service.deletePropertyService('missing')).rejects.toMatchObject({ statusCode: 404 });
            expect(mockRepo.delete).not.toHaveBeenCalled();
        });
    });
});
