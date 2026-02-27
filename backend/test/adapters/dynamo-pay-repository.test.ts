import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/observability', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    tracer: { captureAWSv3Client: (c: any) => c },
    metrics: { addMetric: vi.fn() },
}));

vi.mock('../../src/entities/service', () => ({
    DBService: {
        entities: {
            pay: {
                create: vi.fn(),
                get: vi.fn(),
                query: {
                    byEmployeeId: vi.fn(),
                },
                patch: vi.fn(),
                delete: vi.fn(),
            },
        },
    },
}));

import { DynamoPayRepository } from '../../src/adapters/dynamo-pay-repository';
import { DBService } from '../../src/entities/service';

const mockPay = {
    payId: 'pay-1',
    employeeId: 'emp-1',
    payScheduleId: 'ps-1',
    payType: 'hourly' as const,
    rate: 2500,
    effectiveDate: '2024-01-01',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
};

describe('DynamoPayRepository', () => {
    let repo: DynamoPayRepository;
    const mockEntity = (DBService.entities.pay as any);

    beforeEach(() => {
        vi.clearAllMocks();
        repo = new DynamoPayRepository();
    });

    describe('create', () => {
        it('should create a pay record and return the parsed result', async () => {
            mockEntity.create.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: mockPay }) });

            const result = await repo.create(mockPay);

            expect(result.payId).toBe('pay-1');
            expect(result.rate).toBe(2500);
            expect(result.payType).toBe('hourly');
        });

        it('should throw Data integrity error when create returns invalid data', async () => {
            mockEntity.create.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: { payId: 'pay-1' } }) });

            await expect(repo.create(mockPay)).rejects.toThrow('Data integrity error');
        });
    });

    describe('get', () => {
        it('should return a parsed pay record when found', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: mockPay }) });

            const result = await repo.get('pay-1');

            expect(result).not.toBeNull();
            expect(result!.payId).toBe('pay-1');
        });

        it('should return null when pay record not found', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: null }) });

            const result = await repo.get('pay-1');

            expect(result).toBeNull();
        });

        it('should throw Data integrity error when get returns invalid data', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: { badField: true } }) });

            await expect(repo.get('pay-1')).rejects.toThrow('Data integrity error');
        });
    });

    describe('listByEmployeeId', () => {
        it('should return paginated list of pay records for an employee', async () => {
            mockEntity.query.byEmployeeId.mockReturnValue({
                go: vi.fn().mockResolvedValue({ data: [mockPay], cursor: null }),
            });

            const result = await repo.listByEmployeeId('emp-1');

            expect(result.items).toHaveLength(1);
            expect(result.items[0].payId).toBe('pay-1');
            expect(result.cursor).toBeNull();
        });

        it('should pass limit and cursor options', async () => {
            const mockGo = vi.fn().mockResolvedValue({ data: [mockPay], cursor: 'next-page' });
            mockEntity.query.byEmployeeId.mockReturnValue({ go: mockGo });

            const result = await repo.listByEmployeeId('emp-1', { limit: 5, cursor: 'some-cursor' });

            expect(mockEntity.query.byEmployeeId).toHaveBeenCalledWith({ employeeId: 'emp-1' });
            expect(mockGo).toHaveBeenCalledWith({ limit: 5, cursor: 'some-cursor' });
            expect(result.cursor).toBe('next-page');
        });

        it('should use default page size when no options provided', async () => {
            const mockGo = vi.fn().mockResolvedValue({ data: [], cursor: null });
            mockEntity.query.byEmployeeId.mockReturnValue({ go: mockGo });

            await repo.listByEmployeeId('emp-1');

            expect(mockGo).toHaveBeenCalledWith({ limit: 20 });
        });
    });

    describe('update', () => {
        it('should update a pay record and return the parsed result', async () => {
            const updated = { ...mockPay, rate: 3000 };
            mockEntity.patch.mockReturnValue({
                set: vi.fn().mockReturnValue({ go: vi.fn().mockResolvedValue({ data: updated }) }),
            });

            const result = await repo.update('pay-1', { rate: 3000 });

            expect(result.rate).toBe(3000);
        });

        it('should throw Data integrity error when update returns invalid data', async () => {
            mockEntity.patch.mockReturnValue({
                set: vi.fn().mockReturnValue({ go: vi.fn().mockResolvedValue({ data: { badField: true } }) }),
            });

            await expect(repo.update('pay-1', { rate: 3000 })).rejects.toThrow('Data integrity error');
        });
    });

    describe('delete', () => {
        it('should delete a pay record', async () => {
            mockEntity.delete.mockReturnValue({ go: vi.fn().mockResolvedValue({}) });

            await expect(repo.delete('pay-1')).resolves.toBeUndefined();
            expect(mockEntity.delete).toHaveBeenCalledWith({ payId: 'pay-1' });
        });
    });
});
