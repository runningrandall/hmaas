import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/observability', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), addContext: vi.fn() },
    tracer: { captureAWSv3Client: (c: any) => c },
    metrics: { addMetric: vi.fn() },
}));

import { ServiceTypeService } from '../../src/application/service-type-service';
import { AppError } from '../../src/lib/error';

const mockRepo = {
    create: vi.fn(),
    get: vi.fn(),
    list: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
};

const mockPublisher = { publish: vi.fn() };

describe('ServiceTypeService', () => {
    let service: ServiceTypeService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new ServiceTypeService(mockRepo as any, mockPublisher as any);
    });

    describe('createServiceType', () => {
        it('should create service type, record metric, and return created without publishing event', async () => {
            const request = {
                name: 'Lawn Care',
                description: 'Regular lawn maintenance',
                category: 'outdoor',
            };

            const created = {
                serviceTypeId: 'st-1',
                ...request,
                createdAt: '2024-01-01T00:00:00.000Z',
            };

            mockRepo.create.mockResolvedValue(created);

            const { metrics } = await import('../../src/lib/observability');

            const result = await service.createServiceType(request as any);

            expect(result).toEqual(created);
            expect(mockRepo.create).toHaveBeenCalledOnce();
            expect(metrics.addMetric).toHaveBeenCalledWith('ServiceTypesCreated', expect.any(String), 1);
            expect(mockPublisher.publish).not.toHaveBeenCalled();
        });

        it('should populate serviceTypeId and createdAt', async () => {
            const request = {
                name: 'Pest Control',
                description: 'Pest elimination services',
                category: 'pest',
            };

            mockRepo.create.mockImplementation(async (st: any) => st);

            const result = await service.createServiceType(request as any);

            expect(result.serviceTypeId).toEqual(expect.any(String));
            expect(result.createdAt).toEqual(expect.any(String));
        });
    });

    describe('getServiceType', () => {
        it('should return service type when found', async () => {
            const serviceType = { serviceTypeId: 'st-1', name: 'Lawn Care', category: 'outdoor' };
            mockRepo.get.mockResolvedValue(serviceType);

            const result = await service.getServiceType('st-1');

            expect(result).toEqual(serviceType);
            expect(mockRepo.get).toHaveBeenCalledWith('st-1');
        });

        it('should throw AppError 404 when service type not found', async () => {
            mockRepo.get.mockResolvedValue(null);

            await expect(service.getServiceType('missing')).rejects.toThrow(AppError);
            await expect(service.getServiceType('missing')).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    describe('listServiceTypes', () => {
        it('should delegate to repo.list', async () => {
            const paginated = { items: [{ serviceTypeId: 'st-1' }], count: 1 };
            mockRepo.list.mockResolvedValue(paginated);

            const result = await service.listServiceTypes({ limit: 10 });

            expect(result).toEqual(paginated);
            expect(mockRepo.list).toHaveBeenCalledWith({ limit: 10 });
        });
    });

    describe('updateServiceType', () => {
        it('should update service type and return updated without publishing event', async () => {
            const existing = { serviceTypeId: 'st-1', name: 'Lawn Care', category: 'outdoor' };
            const updated = { serviceTypeId: 'st-1', name: 'Premium Lawn Care', category: 'outdoor' };
            mockRepo.get.mockResolvedValue(existing);
            mockRepo.update.mockResolvedValue(updated);

            const result = await service.updateServiceType('st-1', { name: 'Premium Lawn Care' } as any);

            expect(result).toEqual(updated);
            expect(mockPublisher.publish).not.toHaveBeenCalled();
        });

        it('should throw 404 if service type not found', async () => {
            mockRepo.get.mockResolvedValue(null);

            await expect(service.updateServiceType('missing', { name: 'x' } as any)).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    describe('deleteServiceType', () => {
        it('should delete service type without publishing event', async () => {
            mockRepo.delete.mockResolvedValue(undefined);

            await service.deleteServiceType('st-1');

            expect(mockRepo.delete).toHaveBeenCalledWith('st-1');
            expect(mockPublisher.publish).not.toHaveBeenCalled();
        });
    });
});
