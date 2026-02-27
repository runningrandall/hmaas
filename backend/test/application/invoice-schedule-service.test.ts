import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/observability', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), addContext: vi.fn() },
    tracer: { captureAWSv3Client: (c: any) => c },
    metrics: { addMetric: vi.fn() },
}));

import { InvoiceScheduleService } from '../../src/application/invoice-schedule-service';
import { AppError } from '../../src/lib/error';

const mockRepo = {
    create: vi.fn(),
    get: vi.fn(),
    listByCustomerId: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
};

const mockPublisher = { publish: vi.fn() };

const ORG_ID = 'org-test-123';

describe('InvoiceScheduleService', () => {
    let service: InvoiceScheduleService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new InvoiceScheduleService(mockRepo as any, mockPublisher as any);
    });

    describe('createInvoiceSchedule', () => {
        it('should create invoice schedule, publish InvoiceScheduleCreated event, and record metric', async () => {
            const request = {
                customerId: 'cust-1',
                frequency: 'monthly',
                nextInvoiceDate: '2024-02-01',
                dayOfMonth: 1,
            };

            const created = {
                organizationId: ORG_ID,
                invoiceScheduleId: 'sched-1',
                ...request,
                createdAt: '2024-01-01T00:00:00.000Z',
            };

            mockRepo.create.mockResolvedValue(created);
            mockPublisher.publish.mockResolvedValue(undefined);

            const { metrics } = await import('../../src/lib/observability');

            const result = await service.createInvoiceSchedule(ORG_ID, request as any);

            expect(result).toEqual(created);
            expect(mockRepo.create).toHaveBeenCalledOnce();
            expect(mockPublisher.publish).toHaveBeenCalledWith('InvoiceScheduleCreated', expect.objectContaining({
                organizationId: ORG_ID,
                invoiceScheduleId: created.invoiceScheduleId,
                customerId: request.customerId,
            }));
            expect(metrics.addMetric).toHaveBeenCalledWith('InvoiceSchedulesCreated', expect.any(String), 1);
        });

        it('should populate invoiceScheduleId and createdAt', async () => {
            const request = {
                customerId: 'cust-2',
                frequency: 'annual',
                nextInvoiceDate: '2025-01-01',
                dayOfMonth: 1,
            };

            mockRepo.create.mockImplementation(async (s: any) => s);
            mockPublisher.publish.mockResolvedValue(undefined);

            const result = await service.createInvoiceSchedule(ORG_ID, request as any);

            expect(result.invoiceScheduleId).toEqual(expect.any(String));
            expect(result.createdAt).toEqual(expect.any(String));
        });
    });

    describe('getInvoiceSchedule', () => {
        it('should return invoice schedule when found', async () => {
            const schedule = { organizationId: ORG_ID, invoiceScheduleId: 'sched-1', customerId: 'cust-1', frequency: 'monthly' };
            mockRepo.get.mockResolvedValue(schedule);

            const result = await service.getInvoiceSchedule(ORG_ID, 'sched-1');

            expect(result).toEqual(schedule);
            expect(mockRepo.get).toHaveBeenCalledWith(ORG_ID, 'sched-1');
        });

        it('should throw AppError 404 when invoice schedule not found', async () => {
            mockRepo.get.mockResolvedValue(null);

            await expect(service.getInvoiceSchedule(ORG_ID, 'missing')).rejects.toThrow(AppError);
            await expect(service.getInvoiceSchedule(ORG_ID, 'missing')).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    describe('listInvoiceSchedulesByCustomer', () => {
        it('should delegate to repo.listByCustomerId', async () => {
            const paginated = { items: [{ organizationId: ORG_ID, invoiceScheduleId: 'sched-1' }], count: 1 };
            mockRepo.listByCustomerId.mockResolvedValue(paginated);

            const result = await service.listInvoiceSchedulesByCustomer(ORG_ID, 'cust-1', { limit: 10 });

            expect(result).toEqual(paginated);
            expect(mockRepo.listByCustomerId).toHaveBeenCalledWith(ORG_ID, 'cust-1', { limit: 10 });
        });
    });

    describe('updateInvoiceSchedule', () => {
        it('should update invoice schedule and publish InvoiceScheduleUpdated event', async () => {
            const existing = { organizationId: ORG_ID, invoiceScheduleId: 'sched-1', customerId: 'cust-1', frequency: 'monthly' };
            const updated = { organizationId: ORG_ID, invoiceScheduleId: 'sched-1', customerId: 'cust-1', frequency: 'quarterly' };
            mockRepo.get.mockResolvedValue(existing);
            mockRepo.update.mockResolvedValue(updated);
            mockPublisher.publish.mockResolvedValue(undefined);

            const result = await service.updateInvoiceSchedule(ORG_ID, 'sched-1', { frequency: 'quarterly' } as any);

            expect(result).toEqual(updated);
            expect(mockPublisher.publish).toHaveBeenCalledWith('InvoiceScheduleUpdated', expect.objectContaining({
                organizationId: ORG_ID,
                invoiceScheduleId: 'sched-1',
                customerId: updated.customerId,
            }));
        });

        it('should throw 404 if invoice schedule not found', async () => {
            mockRepo.get.mockResolvedValue(null);

            await expect(service.updateInvoiceSchedule(ORG_ID, 'missing', { frequency: 'monthly' } as any)).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    describe('deleteInvoiceSchedule', () => {
        it('should fetch schedule first, delete it, and publish InvoiceScheduleDeleted event', async () => {
            const schedule = { organizationId: ORG_ID, invoiceScheduleId: 'sched-1', customerId: 'cust-1', frequency: 'monthly' };
            mockRepo.get.mockResolvedValue(schedule);
            mockRepo.delete.mockResolvedValue(undefined);
            mockPublisher.publish.mockResolvedValue(undefined);

            await service.deleteInvoiceSchedule(ORG_ID, 'sched-1');

            expect(mockRepo.get).toHaveBeenCalledWith(ORG_ID, 'sched-1');
            expect(mockRepo.delete).toHaveBeenCalledWith(ORG_ID, 'sched-1');
            expect(mockPublisher.publish).toHaveBeenCalledWith('InvoiceScheduleDeleted', expect.objectContaining({
                organizationId: ORG_ID,
                invoiceScheduleId: 'sched-1',
                customerId: 'cust-1',
            }));
        });

        it('should throw 404 if invoice schedule not found before deleting', async () => {
            mockRepo.get.mockResolvedValue(null);

            await expect(service.deleteInvoiceSchedule(ORG_ID, 'missing')).rejects.toMatchObject({ statusCode: 404 });
            expect(mockRepo.delete).not.toHaveBeenCalled();
        });
    });
});
