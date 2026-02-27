import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/observability', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), addContext: vi.fn() },
    tracer: { captureAWSv3Client: (c: any) => c },
    metrics: { addMetric: vi.fn() },
}));

import { ServicerService } from '../../src/application/servicer-service';
import { AppError } from '../../src/lib/error';

const mockRepo = {
    create: vi.fn(),
    get: vi.fn(),
    list: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getByEmployeeId: vi.fn(),
};

const mockPublisher = { publish: vi.fn() };

describe('ServicerService', () => {
    let service: ServicerService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new ServicerService(mockRepo as any, mockPublisher as any);
    });

    describe('createServicer', () => {
        it('should create servicer with active status, publish ServicerCreated event, and record metric', async () => {
            const request = {
                employeeId: 'emp-1',
                serviceArea: 'North Zone',
                maxDailyJobs: 8,
            };

            const created = {
                servicerId: 'svc-1',
                ...request,
                status: 'active',
                createdAt: '2024-01-01T00:00:00.000Z',
            };

            mockRepo.create.mockResolvedValue(created);
            mockPublisher.publish.mockResolvedValue(undefined);

            const { metrics } = await import('../../src/lib/observability');

            const result = await service.createServicer(request as any);

            expect(result).toEqual(created);
            expect(mockRepo.create).toHaveBeenCalledOnce();
            expect(mockPublisher.publish).toHaveBeenCalledWith('ServicerCreated', {
                servicerId: created.servicerId,
                employeeId: request.employeeId,
            });
            expect(metrics.addMetric).toHaveBeenCalledWith('ServicersCreated', expect.any(String), 1);
        });

        it('should set status to active and populate servicerId and createdAt', async () => {
            const request = {
                employeeId: 'emp-2',
                serviceArea: 'South Zone',
                maxDailyJobs: 6,
            };

            mockRepo.create.mockImplementation(async (s: any) => s);
            mockPublisher.publish.mockResolvedValue(undefined);

            const result = await service.createServicer(request as any);

            expect(result.status).toBe('active');
            expect(result.createdAt).toEqual(expect.any(String));
            expect(result.servicerId).toEqual(expect.any(String));
        });
    });

    describe('getServicer', () => {
        it('should return servicer when found', async () => {
            const servicer = { servicerId: 'svc-1', employeeId: 'emp-1', status: 'active' };
            mockRepo.get.mockResolvedValue(servicer);

            const result = await service.getServicer('svc-1');

            expect(result).toEqual(servicer);
            expect(mockRepo.get).toHaveBeenCalledWith('svc-1');
        });

        it('should throw AppError 404 when servicer not found', async () => {
            mockRepo.get.mockResolvedValue(null);

            await expect(service.getServicer('missing')).rejects.toThrow(AppError);
            await expect(service.getServicer('missing')).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    describe('getServicerByEmployeeId', () => {
        it('should delegate to repo.getByEmployeeId', async () => {
            const paginated = { items: [{ servicerId: 'svc-1', employeeId: 'emp-1' }], count: 1 };
            mockRepo.getByEmployeeId.mockResolvedValue(paginated);

            const result = await service.getServicerByEmployeeId('emp-1', { limit: 10 });

            expect(result).toEqual(paginated);
            expect(mockRepo.getByEmployeeId).toHaveBeenCalledWith('emp-1', { limit: 10 });
        });
    });

    describe('updateServicer', () => {
        it('should update servicer and return updated without publishing event', async () => {
            const existing = { servicerId: 'svc-1', employeeId: 'emp-1', status: 'active' };
            const updated = { servicerId: 'svc-1', employeeId: 'emp-1', maxDailyJobs: 10, status: 'active' };
            mockRepo.get.mockResolvedValue(existing);
            mockRepo.update.mockResolvedValue(updated);

            const result = await service.updateServicer('svc-1', { maxDailyJobs: 10 });

            expect(result).toEqual(updated);
            expect(mockPublisher.publish).not.toHaveBeenCalled();
        });

        it('should throw 404 if servicer not found', async () => {
            mockRepo.get.mockResolvedValue(null);

            await expect(service.updateServicer('missing', { maxDailyJobs: 5 })).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    describe('deleteServicer', () => {
        it('should delete servicer', async () => {
            mockRepo.delete.mockResolvedValue(undefined);

            await service.deleteServicer('svc-1');

            expect(mockRepo.delete).toHaveBeenCalledWith('svc-1');
        });
    });
});
