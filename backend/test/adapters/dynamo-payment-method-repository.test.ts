import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/observability', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    tracer: { captureAWSv3Client: (c: any) => c },
    metrics: { addMetric: vi.fn() },
}));

vi.mock('../../src/entities/service', () => ({
    DBService: {
        entities: {
            paymentMethod: {
                create: vi.fn(),
                get: vi.fn(),
                query: {
                    byCustomerId: vi.fn(),
                },
                delete: vi.fn(),
            },
        },
    },
}));

import { DynamoPaymentMethodRepository } from '../../src/adapters/dynamo-payment-method-repository';
import { DBService } from '../../src/entities/service';

const mockPaymentMethod = {
    paymentMethodId: 'pm-1',
    customerId: 'cust-1',
    type: 'credit_card' as const,
    last4: '4242',
    isDefault: true,
    status: 'active' as const,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
};

describe('DynamoPaymentMethodRepository', () => {
    let repo: DynamoPaymentMethodRepository;
    const mockEntity = (DBService.entities.paymentMethod as any);

    beforeEach(() => {
        vi.clearAllMocks();
        repo = new DynamoPaymentMethodRepository();
    });

    describe('create', () => {
        it('should create a payment method and return the parsed result', async () => {
            mockEntity.create.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: mockPaymentMethod }) });

            const result = await repo.create(mockPaymentMethod);

            expect(result.paymentMethodId).toBe('pm-1');
            expect(result.last4).toBe('4242');
            expect(result.type).toBe('credit_card');
        });

        it('should throw Data integrity error when create returns invalid data', async () => {
            mockEntity.create.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: { paymentMethodId: 'pm-1' } }) });

            await expect(repo.create(mockPaymentMethod)).rejects.toThrow('Data integrity error');
        });
    });

    describe('get', () => {
        it('should return a parsed payment method when found', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: mockPaymentMethod }) });

            const result = await repo.get('pm-1');

            expect(result).not.toBeNull();
            expect(result!.paymentMethodId).toBe('pm-1');
        });

        it('should return null when payment method not found', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: null }) });

            const result = await repo.get('pm-1');

            expect(result).toBeNull();
        });

        it('should throw Data integrity error when get returns invalid data', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: { badField: true } }) });

            await expect(repo.get('pm-1')).rejects.toThrow('Data integrity error');
        });
    });

    describe('listByCustomerId', () => {
        it('should return paginated list of payment methods for a customer', async () => {
            mockEntity.query.byCustomerId.mockReturnValue({
                go: vi.fn().mockResolvedValue({ data: [mockPaymentMethod], cursor: null }),
            });

            const result = await repo.listByCustomerId('cust-1');

            expect(result.items).toHaveLength(1);
            expect(result.items[0].paymentMethodId).toBe('pm-1');
            expect(result.cursor).toBeNull();
        });

        it('should pass limit and cursor options', async () => {
            const mockGo = vi.fn().mockResolvedValue({ data: [mockPaymentMethod], cursor: 'next-page' });
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

    describe('delete', () => {
        it('should delete a payment method', async () => {
            mockEntity.delete.mockReturnValue({ go: vi.fn().mockResolvedValue({}) });

            await expect(repo.delete('pm-1')).resolves.toBeUndefined();
            expect(mockEntity.delete).toHaveBeenCalledWith({ paymentMethodId: 'pm-1' });
        });
    });
});
