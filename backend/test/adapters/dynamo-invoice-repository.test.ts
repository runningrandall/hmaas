import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/observability', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    tracer: { captureAWSv3Client: (c: any) => c },
    metrics: { addMetric: vi.fn() },
}));

vi.mock('../../src/entities/service', () => ({
    DBService: {
        entities: {
            invoice: {
                create: vi.fn(),
                get: vi.fn(),
                query: {
                    byCustomerId: vi.fn(),
                },
                patch: vi.fn(),
            },
        },
    },
}));

import { DynamoInvoiceRepository } from '../../src/adapters/dynamo-invoice-repository';
import { DBService } from '../../src/entities/service';

const mockInvoice = {
    organizationId: 'org-test-123',
    invoiceId: 'inv-1',
    customerId: 'cust-1',
    invoiceNumber: 'INV-2024-001',
    invoiceDate: '2024-01-01',
    dueDate: '2024-01-31',
    subtotal: 9900,
    tax: 891,
    total: 10791,
    status: 'draft' as const,
    lineItems: [
        { description: 'Monthly service', quantity: 1, unitPrice: 9900, total: 9900 },
    ],
    paidAt: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
};

describe('DynamoInvoiceRepository', () => {
    let repo: DynamoInvoiceRepository;
    const mockEntity = (DBService.entities.invoice as any);

    beforeEach(() => {
        vi.clearAllMocks();
        repo = new DynamoInvoiceRepository();
    });

    describe('create', () => {
        it('should create an invoice and return the parsed result', async () => {
            mockEntity.create.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: mockInvoice }) });

            const result = await repo.create(mockInvoice);

            expect(result.invoiceId).toBe('inv-1');
            expect(result.invoiceNumber).toBe('INV-2024-001');
            expect(result.total).toBe(10791);
        });

        it('should throw Data integrity error when create returns invalid data', async () => {
            mockEntity.create.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: { invoiceId: 'inv-1' } }) });

            await expect(repo.create(mockInvoice)).rejects.toThrow('Data integrity error');
        });
    });

    describe('get', () => {
        it('should return a parsed invoice when found', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: mockInvoice }) });

            const result = await repo.get('org-test-123', 'inv-1');

            expect(result).not.toBeNull();
            expect(result!.invoiceId).toBe('inv-1');
        });

        it('should return null when invoice not found', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: null }) });

            const result = await repo.get('org-test-123', 'inv-1');

            expect(result).toBeNull();
        });

        it('should throw Data integrity error when get returns invalid data', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: { badField: true } }) });

            await expect(repo.get('org-test-123', 'inv-1')).rejects.toThrow('Data integrity error');
        });
    });

    describe('listByCustomerId', () => {
        it('should return paginated list of invoices for a customer', async () => {
            mockEntity.query.byCustomerId.mockReturnValue({
                go: vi.fn().mockResolvedValue({ data: [mockInvoice], cursor: null }),
            });

            const result = await repo.listByCustomerId('org-test-123', 'cust-1');

            expect(result.items).toHaveLength(1);
            expect(result.items[0].invoiceId).toBe('inv-1');
            expect(result.cursor).toBeNull();
        });

        it('should pass limit and cursor options', async () => {
            const mockGo = vi.fn().mockResolvedValue({ data: [mockInvoice], cursor: 'next-page' });
            mockEntity.query.byCustomerId.mockReturnValue({ go: mockGo });

            const result = await repo.listByCustomerId('org-test-123', 'cust-1', { limit: 5, cursor: 'some-cursor' });

            expect(mockEntity.query.byCustomerId).toHaveBeenCalledWith({ organizationId: 'org-test-123', customerId: 'cust-1' });
            expect(mockGo).toHaveBeenCalledWith({ limit: 5, cursor: 'some-cursor' });
            expect(result.cursor).toBe('next-page');
        });

        it('should use default page size when no options provided', async () => {
            const mockGo = vi.fn().mockResolvedValue({ data: [], cursor: null });
            mockEntity.query.byCustomerId.mockReturnValue({ go: mockGo });

            await repo.listByCustomerId('org-test-123', 'cust-1');

            expect(mockGo).toHaveBeenCalledWith({ limit: 20 });
        });
    });

    describe('update', () => {
        it('should update an invoice and return the parsed result', async () => {
            const updated = { ...mockInvoice, status: 'sent' as const };
            mockEntity.patch.mockReturnValue({
                set: vi.fn().mockReturnValue({ go: vi.fn().mockResolvedValue({ data: updated }) }),
            });

            const result = await repo.update('org-test-123', 'inv-1', { status: 'sent' });

            expect(result.status).toBe('sent');
        });

        it('should throw Data integrity error when update returns invalid data', async () => {
            mockEntity.patch.mockReturnValue({
                set: vi.fn().mockReturnValue({ go: vi.fn().mockResolvedValue({ data: { badField: true } }) }),
            });

            await expect(repo.update('org-test-123', 'inv-1', { status: 'sent' })).rejects.toThrow('Data integrity error');
        });
    });
});
