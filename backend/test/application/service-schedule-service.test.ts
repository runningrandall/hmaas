import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/observability', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), addContext: vi.fn() },
    tracer: { captureAWSv3Client: (c: any) => c },
    metrics: { addMetric: vi.fn() },
}));

import { ServiceScheduleService } from '../../src/application/service-schedule-service';
import { AppError } from '../../src/lib/error';

const mockRepo = {
    create: vi.fn(),
    get: vi.fn(),
    listByServicerId: vi.fn(),
    update: vi.fn(),
};

const mockPublisher = { publish: vi.fn() };

const ORG_ID = 'org-test-123';

describe('ServiceScheduleService', () => {
    let service: ServiceScheduleService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new ServiceScheduleService(mockRepo as any, mockPublisher as any);
    });

    describe('createServiceSchedule', () => {
        it('should create service schedule with scheduled status, publish ServiceScheduleCreated event, and record metric', async () => {
            const request = {
                serviceId: 'psvc-1',
                servicerId: 'svc-1',
                scheduledDate: '2024-02-15',
                scheduledTime: '09:00',
                estimatedDuration: 120,
            };

            const created = {
                organizationId: ORG_ID,
                serviceScheduleId: 'ss-1',
                ...request,
                status: 'scheduled',
                createdAt: '2024-01-01T00:00:00.000Z',
            };

            mockRepo.create.mockResolvedValue(created);
            mockPublisher.publish.mockResolvedValue(undefined);

            const { metrics } = await import('../../src/lib/observability');

            const result = await service.createServiceSchedule(ORG_ID, request as any);

            expect(result).toEqual(created);
            expect(mockRepo.create).toHaveBeenCalledOnce();
            expect(mockPublisher.publish).toHaveBeenCalledWith('ServiceScheduleCreated', expect.objectContaining({
                organizationId: ORG_ID,
                serviceScheduleId: created.serviceScheduleId,
                serviceId: request.serviceId,
                servicerId: request.servicerId,
            }));
            expect(metrics.addMetric).toHaveBeenCalledWith('ServiceSchedulesCreated', expect.any(String), 1);
        });

        it('should set status to scheduled and populate serviceScheduleId and createdAt', async () => {
            const request = {
                serviceId: 'psvc-2',
                servicerId: 'svc-2',
                scheduledDate: '2024-03-01',
                scheduledTime: '14:00',
                estimatedDuration: 60,
            };

            mockRepo.create.mockImplementation(async (ss: any) => ss);
            mockPublisher.publish.mockResolvedValue(undefined);

            const result = await service.createServiceSchedule(ORG_ID, request as any);

            expect(result.status).toBe('scheduled');
            expect(result.serviceScheduleId).toEqual(expect.any(String));
            expect(result.createdAt).toEqual(expect.any(String));
        });
    });

    describe('getServiceSchedule', () => {
        it('should return service schedule when found', async () => {
            const schedule = { organizationId: ORG_ID, serviceScheduleId: 'ss-1', serviceId: 'psvc-1', servicerId: 'svc-1', status: 'scheduled' };
            mockRepo.get.mockResolvedValue(schedule);

            const result = await service.getServiceSchedule(ORG_ID, 'ss-1');

            expect(result).toEqual(schedule);
            expect(mockRepo.get).toHaveBeenCalledWith(ORG_ID, 'ss-1');
        });

        it('should throw AppError 404 when service schedule not found', async () => {
            mockRepo.get.mockResolvedValue(null);

            await expect(service.getServiceSchedule(ORG_ID, 'missing')).rejects.toThrow(AppError);
            await expect(service.getServiceSchedule(ORG_ID, 'missing')).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    describe('listByServicerId', () => {
        it('should delegate to repo.listByServicerId', async () => {
            const paginated = { items: [{ organizationId: ORG_ID, serviceScheduleId: 'ss-1', servicerId: 'svc-1' }], count: 1 };
            mockRepo.listByServicerId.mockResolvedValue(paginated);

            const result = await service.listByServicerId(ORG_ID, 'svc-1', { limit: 10 });

            expect(result).toEqual(paginated);
            expect(mockRepo.listByServicerId).toHaveBeenCalledWith(ORG_ID, 'svc-1', { limit: 10 });
        });
    });

    describe('updateServiceSchedule', () => {
        it('should update service schedule without publishing event when status does not change to completed', async () => {
            const existing = { organizationId: ORG_ID, serviceScheduleId: 'ss-1', serviceId: 'psvc-1', servicerId: 'svc-1', status: 'scheduled' };
            const updated = { organizationId: ORG_ID, serviceScheduleId: 'ss-1', serviceId: 'psvc-1', servicerId: 'svc-1', status: 'in_progress' };
            mockRepo.get.mockResolvedValue(existing);
            mockRepo.update.mockResolvedValue(updated);
            mockPublisher.publish.mockResolvedValue(undefined);

            const result = await service.updateServiceSchedule(ORG_ID, 'ss-1', { status: 'in_progress' } as any);

            expect(result).toEqual(updated);
            expect(mockPublisher.publish).not.toHaveBeenCalled();
        });

        it('should publish ServiceScheduleCompleted when status changes from non-completed to completed', async () => {
            const existing = { organizationId: ORG_ID, serviceScheduleId: 'ss-1', serviceId: 'psvc-1', servicerId: 'svc-1', status: 'in_progress' };
            const updated = { organizationId: ORG_ID, serviceScheduleId: 'ss-1', serviceId: 'psvc-1', servicerId: 'svc-1', status: 'completed' };
            mockRepo.get.mockResolvedValue(existing);
            mockRepo.update.mockResolvedValue(updated);
            mockPublisher.publish.mockResolvedValue(undefined);

            const result = await service.updateServiceSchedule(ORG_ID, 'ss-1', { status: 'completed' } as any);

            expect(result).toEqual(updated);
            expect(mockPublisher.publish).toHaveBeenCalledWith('ServiceScheduleCompleted', expect.objectContaining({
                organizationId: ORG_ID,
                serviceScheduleId: 'ss-1',
                serviceId: 'psvc-1',
                servicerId: 'svc-1',
            }));
        });

        it('should not publish ServiceScheduleCompleted when status was already completed', async () => {
            const existing = { organizationId: ORG_ID, serviceScheduleId: 'ss-1', serviceId: 'psvc-1', servicerId: 'svc-1', status: 'completed' };
            const updated = { organizationId: ORG_ID, serviceScheduleId: 'ss-1', serviceId: 'psvc-1', servicerId: 'svc-1', status: 'completed' };
            mockRepo.get.mockResolvedValue(existing);
            mockRepo.update.mockResolvedValue(updated);

            await service.updateServiceSchedule(ORG_ID, 'ss-1', { status: 'completed' } as any);

            expect(mockPublisher.publish).not.toHaveBeenCalled();
        });

        it('should throw 404 if service schedule not found', async () => {
            mockRepo.get.mockResolvedValue(null);

            await expect(service.updateServiceSchedule(ORG_ID, 'missing', { status: 'completed' } as any)).rejects.toMatchObject({ statusCode: 404 });
        });
    });
});
