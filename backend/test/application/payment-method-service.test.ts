import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/observability', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), addContext: vi.fn() },
    tracer: { captureAWSv3Client: (c: any) => c },
    metrics: { addMetric: vi.fn() },
}));

import { PaymentMethodService } from '../../src/application/payment-method-service';
import { AppError } from '../../src/lib/error';

const mockRepo = {
    create: vi.fn(),
    get: vi.fn(),
    listByCustomerId: vi.fn(),
    delete: vi.fn(),
};

const mockPublisher = { publish: vi.fn() };

const ORG_ID = 'org-test-123';

describe('PaymentMethodService', () => {
    let service: PaymentMethodService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new PaymentMethodService(mockRepo as any, mockPublisher as any);
    });

    describe('createPaymentMethod', () => {
        it('should create payment method with active status, publish PaymentMethodAdded event, and record metric', async () => {
            const request = {
                customerId: 'cust-1',
                type: 'credit_card',
                last4: '4242',
                isDefault: true,
            };

            const created = {
                organizationId: ORG_ID,
                paymentMethodId: 'pm-1',
                ...request,
                status: 'active',
                createdAt: '2024-01-01T00:00:00.000Z',
            };

            mockRepo.create.mockResolvedValue(created);
            mockPublisher.publish.mockResolvedValue(undefined);

            const { metrics } = await import('../../src/lib/observability');

            const result = await service.createPaymentMethod(ORG_ID, request as any);

            expect(result).toEqual(created);
            expect(mockRepo.create).toHaveBeenCalledOnce();
            expect(mockPublisher.publish).toHaveBeenCalledWith('PaymentMethodAdded', expect.objectContaining({
                organizationId: ORG_ID,
                paymentMethodId: created.paymentMethodId,
                customerId: request.customerId,
            }));
            expect(metrics.addMetric).toHaveBeenCalledWith('PaymentMethodsAdded', expect.any(String), 1);
        });

        it('should set status to active and populate paymentMethodId and createdAt', async () => {
            const request = {
                customerId: 'cust-2',
                type: 'bank_account',
                last4: '6789',
                isDefault: false,
            };

            mockRepo.create.mockImplementation(async (pm: any) => pm);
            mockPublisher.publish.mockResolvedValue(undefined);

            const result = await service.createPaymentMethod(ORG_ID, request as any);

            expect(result.status).toBe('active');
            expect(result.paymentMethodId).toEqual(expect.any(String));
            expect(result.createdAt).toEqual(expect.any(String));
        });
    });

    describe('getPaymentMethod', () => {
        it('should return payment method when found', async () => {
            const pm = { organizationId: ORG_ID, paymentMethodId: 'pm-1', customerId: 'cust-1', type: 'credit_card', status: 'active' };
            mockRepo.get.mockResolvedValue(pm);

            const result = await service.getPaymentMethod(ORG_ID, 'pm-1');

            expect(result).toEqual(pm);
            expect(mockRepo.get).toHaveBeenCalledWith(ORG_ID, 'pm-1');
        });

        it('should throw AppError 404 when payment method not found', async () => {
            mockRepo.get.mockResolvedValue(null);

            await expect(service.getPaymentMethod(ORG_ID, 'missing')).rejects.toThrow(AppError);
            await expect(service.getPaymentMethod(ORG_ID, 'missing')).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    describe('listPaymentMethodsByCustomer', () => {
        it('should delegate to repo.listByCustomerId', async () => {
            const paginated = { items: [{ organizationId: ORG_ID, paymentMethodId: 'pm-1' }], count: 1 };
            mockRepo.listByCustomerId.mockResolvedValue(paginated);

            const result = await service.listPaymentMethodsByCustomer(ORG_ID, 'cust-1', { limit: 10 });

            expect(result).toEqual(paginated);
            expect(mockRepo.listByCustomerId).toHaveBeenCalledWith(ORG_ID, 'cust-1', { limit: 10 });
        });
    });

    describe('deletePaymentMethod', () => {
        it('should fetch payment method first, delete it, and publish PaymentMethodRemoved event', async () => {
            const pm = { organizationId: ORG_ID, paymentMethodId: 'pm-1', customerId: 'cust-1', type: 'credit_card', status: 'active' };
            mockRepo.get.mockResolvedValue(pm);
            mockRepo.delete.mockResolvedValue(undefined);
            mockPublisher.publish.mockResolvedValue(undefined);

            await service.deletePaymentMethod(ORG_ID, 'pm-1');

            expect(mockRepo.get).toHaveBeenCalledWith(ORG_ID, 'pm-1');
            expect(mockRepo.delete).toHaveBeenCalledWith(ORG_ID, 'pm-1');
            expect(mockPublisher.publish).toHaveBeenCalledWith('PaymentMethodRemoved', expect.objectContaining({
                organizationId: ORG_ID,
                paymentMethodId: 'pm-1',
                customerId: 'cust-1',
            }));
        });

        it('should throw 404 if payment method not found before deleting', async () => {
            mockRepo.get.mockResolvedValue(null);

            await expect(service.deletePaymentMethod(ORG_ID, 'missing')).rejects.toMatchObject({ statusCode: 404 });
            expect(mockRepo.delete).not.toHaveBeenCalled();
        });
    });
});
