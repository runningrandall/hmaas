import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/observability', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), addContext: vi.fn() },
    tracer: { captureAWSv3Client: (c: any) => c },
    metrics: { addMetric: vi.fn() },
}));

import { PayService } from '../../src/application/pay-service';
import { AppError } from '../../src/lib/error';

const mockRepo = {
    create: vi.fn(),
    get: vi.fn(),
    listByEmployeeId: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
};

describe('PayService', () => {
    let service: PayService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new PayService(mockRepo as any);
    });

    describe('createPay', () => {
        it('should create pay record and record metric without publishing an event', async () => {
            const request = {
                employeeId: 'emp-1',
                payScheduleId: 'ps-1',
                payType: 'hourly',
                rate: 2000,
                effectiveDate: '2024-01-01',
            };

            const created = {
                payId: 'pay-1',
                ...request,
                createdAt: '2024-01-01T00:00:00.000Z',
            };

            mockRepo.create.mockResolvedValue(created);

            const { metrics } = await import('../../src/lib/observability');

            const result = await service.createPay(request as any);

            expect(result).toEqual(created);
            expect(mockRepo.create).toHaveBeenCalledOnce();
            expect(metrics.addMetric).toHaveBeenCalledWith('PayRecordsCreated', expect.any(String), 1);
        });

        it('should populate payId and createdAt', async () => {
            const request = {
                employeeId: 'emp-2',
                payScheduleId: 'ps-2',
                payType: 'salary',
                rate: 500000,
                effectiveDate: '2024-06-01',
            };

            mockRepo.create.mockImplementation(async (p: any) => p);

            const result = await service.createPay(request as any);

            expect(result.payId).toEqual(expect.any(String));
            expect(result.createdAt).toEqual(expect.any(String));
        });
    });

    describe('getPay', () => {
        it('should return pay record when found', async () => {
            const pay = { payId: 'pay-1', employeeId: 'emp-1', payType: 'hourly', rate: 2000 };
            mockRepo.get.mockResolvedValue(pay);

            const result = await service.getPay('pay-1');

            expect(result).toEqual(pay);
            expect(mockRepo.get).toHaveBeenCalledWith('pay-1');
        });

        it('should throw AppError 404 when pay record not found', async () => {
            mockRepo.get.mockResolvedValue(null);

            await expect(service.getPay('missing')).rejects.toThrow(AppError);
            await expect(service.getPay('missing')).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    describe('listPayByEmployee', () => {
        it('should delegate to repo.listByEmployeeId', async () => {
            const paginated = { items: [{ payId: 'pay-1', employeeId: 'emp-1' }], count: 1 };
            mockRepo.listByEmployeeId.mockResolvedValue(paginated);

            const result = await service.listPayByEmployee('emp-1', { limit: 10 });

            expect(result).toEqual(paginated);
            expect(mockRepo.listByEmployeeId).toHaveBeenCalledWith('emp-1', { limit: 10 });
        });
    });

    describe('updatePay', () => {
        it('should update pay record and return updated without publishing event', async () => {
            const existing = { payId: 'pay-1', employeeId: 'emp-1', rate: 2000 };
            const updated = { payId: 'pay-1', employeeId: 'emp-1', rate: 2500 };
            mockRepo.get.mockResolvedValue(existing);
            mockRepo.update.mockResolvedValue(updated);

            const result = await service.updatePay('pay-1', { rate: 2500 } as any);

            expect(result).toEqual(updated);
        });

        it('should throw 404 if pay record not found', async () => {
            mockRepo.get.mockResolvedValue(null);

            await expect(service.updatePay('missing', { rate: 3000 } as any)).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    describe('deletePay', () => {
        it('should delete pay record without publishing event', async () => {
            mockRepo.delete.mockResolvedValue(undefined);

            await service.deletePay('pay-1');

            expect(mockRepo.delete).toHaveBeenCalledWith('pay-1');
        });
    });
});
