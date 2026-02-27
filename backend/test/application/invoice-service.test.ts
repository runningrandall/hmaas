import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/observability', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), addContext: vi.fn() },
    tracer: { captureAWSv3Client: (c: any) => c },
    metrics: { addMetric: vi.fn() },
}));

import { InvoiceService } from '../../src/application/invoice-service';
import { AppError } from '../../src/lib/error';

const mockRepo = {
    create: vi.fn(),
    get: vi.fn(),
    listByCustomerId: vi.fn(),
    update: vi.fn(),
};

const mockPublisher = { publish: vi.fn() };

const ORG_ID = 'org-test-123';

describe('InvoiceService', () => {
    let service: InvoiceService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new InvoiceService(mockRepo as any, mockPublisher as any);
    });

    describe('createInvoice', () => {
        it('should create invoice with draft status, publish InvoiceCreated event, and record metric', async () => {
            const request = {
                customerId: 'cust-1',
                invoiceNumber: 'INV-001',
                invoiceDate: '2024-01-01',
                dueDate: '2024-01-31',
                subtotal: 9000,
                tax: 900,
                total: 9900,
                lineItems: [{ description: 'Lawn care', amount: 9000 }],
            };

            const created = {
                organizationId: ORG_ID,
                invoiceId: 'inv-1',
                ...request,
                status: 'draft',
                createdAt: '2024-01-01T00:00:00.000Z',
            };

            mockRepo.create.mockResolvedValue(created);
            mockPublisher.publish.mockResolvedValue(undefined);

            const { metrics } = await import('../../src/lib/observability');

            const result = await service.createInvoice(ORG_ID, request as any);

            expect(result).toEqual(created);
            expect(mockRepo.create).toHaveBeenCalledOnce();
            expect(mockPublisher.publish).toHaveBeenCalledWith('InvoiceCreated', expect.objectContaining({
                organizationId: ORG_ID,
                invoiceId: created.invoiceId,
                customerId: request.customerId,
            }));
            expect(metrics.addMetric).toHaveBeenCalledWith('InvoicesCreated', expect.any(String), 1);
        });

        it('should set status to draft and populate invoiceId and createdAt', async () => {
            const request = {
                customerId: 'cust-2',
                invoiceNumber: 'INV-002',
                invoiceDate: '2024-02-01',
                dueDate: '2024-02-28',
                subtotal: 5000,
                tax: 500,
                total: 5500,
                lineItems: [],
            };

            mockRepo.create.mockImplementation(async (i: any) => i);
            mockPublisher.publish.mockResolvedValue(undefined);

            const result = await service.createInvoice(ORG_ID, request as any);

            expect(result.status).toBe('draft');
            expect(result.invoiceId).toEqual(expect.any(String));
            expect(result.createdAt).toEqual(expect.any(String));
        });
    });

    describe('getInvoice', () => {
        it('should return invoice when found', async () => {
            const invoice = { organizationId: ORG_ID, invoiceId: 'inv-1', customerId: 'cust-1', status: 'draft' };
            mockRepo.get.mockResolvedValue(invoice);

            const result = await service.getInvoice(ORG_ID, 'inv-1');

            expect(result).toEqual(invoice);
            expect(mockRepo.get).toHaveBeenCalledWith(ORG_ID, 'inv-1');
        });

        it('should throw AppError 404 when invoice not found', async () => {
            mockRepo.get.mockResolvedValue(null);

            await expect(service.getInvoice(ORG_ID, 'missing')).rejects.toThrow(AppError);
            await expect(service.getInvoice(ORG_ID, 'missing')).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    describe('listInvoicesByCustomer', () => {
        it('should delegate to repo.listByCustomerId', async () => {
            const paginated = { items: [{ organizationId: ORG_ID, invoiceId: 'inv-1' }], count: 1 };
            mockRepo.listByCustomerId.mockResolvedValue(paginated);

            const result = await service.listInvoicesByCustomer(ORG_ID, 'cust-1', { limit: 10 });

            expect(result).toEqual(paginated);
            expect(mockRepo.listByCustomerId).toHaveBeenCalledWith(ORG_ID, 'cust-1', { limit: 10 });
        });
    });

    describe('updateInvoice', () => {
        it('should update invoice without special behavior when status does not change to paid', async () => {
            const existing = { organizationId: ORG_ID, invoiceId: 'inv-1', customerId: 'cust-1', status: 'draft', total: 9900 };
            const updated = { organizationId: ORG_ID, invoiceId: 'inv-1', customerId: 'cust-1', status: 'sent', total: 9900 };
            mockRepo.get.mockResolvedValue(existing);
            mockRepo.update.mockResolvedValue(updated);
            mockPublisher.publish.mockResolvedValue(undefined);

            const result = await service.updateInvoice(ORG_ID, 'inv-1', { status: 'sent' });

            expect(result).toEqual(updated);
            expect(mockPublisher.publish).not.toHaveBeenCalled();
        });

        it('should auto-set paidAt, publish InvoicePaid event, and record metric when status changes to paid', async () => {
            const existing = { organizationId: ORG_ID, invoiceId: 'inv-1', customerId: 'cust-1', status: 'sent', total: 9900 };
            const updated = {
                organizationId: ORG_ID,
                invoiceId: 'inv-1',
                customerId: 'cust-1',
                status: 'paid',
                total: 9900,
                paidAt: '2024-01-15T00:00:00.000Z',
            };
            mockRepo.get.mockResolvedValue(existing);
            mockRepo.update.mockResolvedValue(updated);
            mockPublisher.publish.mockResolvedValue(undefined);

            const { metrics } = await import('../../src/lib/observability');

            const result = await service.updateInvoice(ORG_ID, 'inv-1', { status: 'paid' });

            expect(result).toEqual(updated);
            expect(mockPublisher.publish).toHaveBeenCalledWith('InvoicePaid', expect.objectContaining({
                organizationId: ORG_ID,
                invoiceId: 'inv-1',
                customerId: 'cust-1',
                total: 9900,
                paidAt: expect.any(String),
            }));
            expect(metrics.addMetric).toHaveBeenCalledWith('InvoicesPaid', expect.any(String), 1);
        });

        it('should not publish InvoicePaid when invoice is already paid', async () => {
            const existing = { organizationId: ORG_ID, invoiceId: 'inv-1', customerId: 'cust-1', status: 'paid', total: 9900 };
            const updated = { organizationId: ORG_ID, invoiceId: 'inv-1', customerId: 'cust-1', status: 'paid', total: 9900 };
            mockRepo.get.mockResolvedValue(existing);
            mockRepo.update.mockResolvedValue(updated);

            await service.updateInvoice(ORG_ID, 'inv-1', { status: 'paid' });

            expect(mockPublisher.publish).not.toHaveBeenCalled();
        });

        it('should throw 404 if invoice not found', async () => {
            mockRepo.get.mockResolvedValue(null);

            await expect(service.updateInvoice(ORG_ID, 'missing', { status: 'sent' })).rejects.toMatchObject({ statusCode: 404 });
        });
    });
});
