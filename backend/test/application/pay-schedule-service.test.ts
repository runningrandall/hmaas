import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/observability', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), addContext: vi.fn() },
    tracer: { captureAWSv3Client: (c: any) => c },
    metrics: { addMetric: vi.fn() },
}));

import { PayScheduleService } from '../../src/application/pay-schedule-service';
import { AppError } from '../../src/lib/error';

const mockRepo = {
    create: vi.fn(),
    get: vi.fn(),
    list: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
};

const ORG_ID = 'org-test-123';

describe('PayScheduleService', () => {
    let service: PayScheduleService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new PayScheduleService(mockRepo as any);
    });

    describe('createPaySchedule', () => {
        it('should create pay schedule and record metric without publishing an event', async () => {
            const request = {
                name: 'Bi-Weekly',
                frequency: 'bi-weekly',
                dayOfWeek: 5,
                dayOfMonth: undefined,
            };

            const created = {
                organizationId: ORG_ID,
                payScheduleId: 'psched-1',
                ...request,
                createdAt: '2024-01-01T00:00:00.000Z',
            };

            mockRepo.create.mockResolvedValue(created);

            const { metrics } = await import('../../src/lib/observability');

            const result = await service.createPaySchedule(ORG_ID, request as any);

            expect(result).toEqual(created);
            expect(mockRepo.create).toHaveBeenCalledOnce();
            expect(metrics.addMetric).toHaveBeenCalledWith('PaySchedulesCreated', expect.any(String), 1);
        });

        it('should populate payScheduleId and createdAt', async () => {
            const request = {
                name: 'Monthly',
                frequency: 'monthly',
                dayOfMonth: 1,
            };

            mockRepo.create.mockImplementation(async (ps: any) => ps);

            const result = await service.createPaySchedule(ORG_ID, request as any);

            expect(result.payScheduleId).toEqual(expect.any(String));
            expect(result.createdAt).toEqual(expect.any(String));
        });
    });

    describe('getPaySchedule', () => {
        it('should return pay schedule when found', async () => {
            const schedule = { organizationId: ORG_ID, payScheduleId: 'psched-1', name: 'Bi-Weekly', frequency: 'bi-weekly' };
            mockRepo.get.mockResolvedValue(schedule);

            const result = await service.getPaySchedule(ORG_ID, 'psched-1');

            expect(result).toEqual(schedule);
            expect(mockRepo.get).toHaveBeenCalledWith(ORG_ID, 'psched-1');
        });

        it('should throw AppError 404 when pay schedule not found', async () => {
            mockRepo.get.mockResolvedValue(null);

            await expect(service.getPaySchedule(ORG_ID, 'missing')).rejects.toThrow(AppError);
            await expect(service.getPaySchedule(ORG_ID, 'missing')).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    describe('listPaySchedules', () => {
        it('should delegate to repo.list', async () => {
            const paginated = { items: [{ organizationId: ORG_ID, payScheduleId: 'psched-1' }], count: 1 };
            mockRepo.list.mockResolvedValue(paginated);

            const result = await service.listPaySchedules(ORG_ID, { limit: 10 });

            expect(result).toEqual(paginated);
            expect(mockRepo.list).toHaveBeenCalledWith(ORG_ID, { limit: 10 });
        });
    });

    describe('updatePaySchedule', () => {
        it('should update pay schedule and return updated without publishing event', async () => {
            const existing = { organizationId: ORG_ID, payScheduleId: 'psched-1', name: 'Bi-Weekly', frequency: 'bi-weekly' };
            const updated = { organizationId: ORG_ID, payScheduleId: 'psched-1', name: 'Bi-Weekly Updated', frequency: 'bi-weekly' };
            mockRepo.get.mockResolvedValue(existing);
            mockRepo.update.mockResolvedValue(updated);

            const result = await service.updatePaySchedule(ORG_ID, 'psched-1', { name: 'Bi-Weekly Updated' } as any);

            expect(result).toEqual(updated);
        });

        it('should throw 404 if pay schedule not found', async () => {
            mockRepo.get.mockResolvedValue(null);

            await expect(service.updatePaySchedule(ORG_ID, 'missing', { name: 'x' } as any)).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    describe('deletePaySchedule', () => {
        it('should delete pay schedule without publishing event', async () => {
            mockRepo.delete.mockResolvedValue(undefined);

            await service.deletePaySchedule(ORG_ID, 'psched-1');

            expect(mockRepo.delete).toHaveBeenCalledWith(ORG_ID, 'psched-1');
        });
    });
});
