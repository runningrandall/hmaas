import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/observability', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    tracer: { captureAWSv3Client: (c: any) => c },
    metrics: { addMetric: vi.fn() },
}));

vi.mock('../../src/entities/service', () => ({
    DBService: {
        entities: {
            invoiceSchedule: {
                create: vi.fn(),
                get: vi.fn(),
                query: {
                    byCustomerId: vi.fn(),
                },
                patch: vi.fn(),
                delete: vi.fn(),
            },
        },
    },
}));

import { DynamoInvoiceScheduleRepository } from '../../src/adapters/dynamo-invoice-schedule-repository';
import { DBService } from '../../src/entities/service';

const mockInvoiceSchedule = {
    invoiceScheduleId: 'is-1',
    customerId: 'cust-1',
    frequency: 'monthly' as const,
    nextInvoiceDate: '2024-02-01',
    dayOfMonth: 1,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
};

describe('DynamoInvoiceScheduleRepository', () => {
    let repo: DynamoInvoiceScheduleRepository;
    const mockEntity = (DBService.entities.invoiceSchedule as any);

    beforeEach(() => {
        vi.clearAllMocks();
        repo = new DynamoInvoiceScheduleRepository();
    });

    describe('create', () => {
        it('should create an invoice schedule and return the parsed result', async () => {
            mockEntity.create.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: mockInvoiceSchedule }) });

            const result = await repo.create(mockInvoiceSchedule);

            expect(result.invoiceScheduleId).toBe('is-1');
            expect(result.frequency).toBe('monthly');
            expect(result.nextInvoiceDate).toBe('2024-02-01');
        });

        it('should throw Data integrity error when create returns invalid data', async () => {
            mockEntity.create.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: { invoiceScheduleId: 'is-1' } }) });

            await expect(repo.create(mockInvoiceSchedule)).rejects.toThrow('Data integrity error');
        });
    });

    describe('get', () => {
        it('should return a parsed invoice schedule when found', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: mockInvoiceSchedule }) });

            const result = await repo.get('is-1');

            expect(result).not.toBeNull();
            expect(result!.invoiceScheduleId).toBe('is-1');
        });

        it('should return null when invoice schedule not found', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: null }) });

            const result = await repo.get('is-1');

            expect(result).toBeNull();
        });

        it('should throw Data integrity error when get returns invalid data', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: { badField: true } }) });

            await expect(repo.get('is-1')).rejects.toThrow('Data integrity error');
        });
    });

    describe('listByCustomerId', () => {
        it('should return paginated list of invoice schedules for a customer', async () => {
            mockEntity.query.byCustomerId.mockReturnValue({
                go: vi.fn().mockResolvedValue({ data: [mockInvoiceSchedule], cursor: null }),
            });

            const result = await repo.listByCustomerId('cust-1');

            expect(result.items).toHaveLength(1);
            expect(result.items[0].invoiceScheduleId).toBe('is-1');
            expect(result.cursor).toBeNull();
        });

        it('should pass limit and cursor options', async () => {
            const mockGo = vi.fn().mockResolvedValue({ data: [mockInvoiceSchedule], cursor: 'next-page' });
            mockEntity.query.byCustomerId.mockReturnValue({ go: mockGo });

            const result = await repo.listByCustomerId('cust-1', { limit: 5, cursor: 'some-cursor' });

            expect(mockEntity.query.byCustomerId).toHaveBeenCalledWith({ customerId: 'cust-1' });
            expect(mockGo).toHaveBeenCalledWith({ limit: 5, cursor: 'some-cursor' });
            expect(result.cursor).toBe('next-page');
        });

        it('should use default page size when no options provided', async () => {
            const mockGo = vi.fn().mockResolvedValue({ data: [], cursor: null });
            mockEntity.query.byCustomerId.mockReturnValue({ go: mockGo });

            await repo.listByCustomerId('cust-1');

            expect(mockGo).toHaveBeenCalledWith({ limit: 20 });
        });
    });

    describe('update', () => {
        it('should update an invoice schedule and return the parsed result', async () => {
            const updated = { ...mockInvoiceSchedule, nextInvoiceDate: '2024-03-01' };
            mockEntity.patch.mockReturnValue({
                set: vi.fn().mockReturnValue({ go: vi.fn().mockResolvedValue({ data: updated }) }),
            });

            const result = await repo.update('is-1', { nextInvoiceDate: '2024-03-01' });

            expect(result.nextInvoiceDate).toBe('2024-03-01');
        });

        it('should throw Data integrity error when update returns invalid data', async () => {
            mockEntity.patch.mockReturnValue({
                set: vi.fn().mockReturnValue({ go: vi.fn().mockResolvedValue({ data: { badField: true } }) }),
            });

            await expect(repo.update('is-1', { nextInvoiceDate: '2024-03-01' })).rejects.toThrow('Data integrity error');
        });
    });

    describe('delete', () => {
        it('should delete an invoice schedule', async () => {
            mockEntity.delete.mockReturnValue({ go: vi.fn().mockResolvedValue({}) });

            await expect(repo.delete('is-1')).resolves.toBeUndefined();
            expect(mockEntity.delete).toHaveBeenCalledWith({ invoiceScheduleId: 'is-1' });
        });
    });
});
