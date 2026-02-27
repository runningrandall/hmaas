import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeCreateEvent, makeGetEvent, makeListEvent, makeUpdateEvent, mockContext } from '../../helpers/test-utils';

vi.mock('../../../src/lib/observability', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), addContext: vi.fn() },
    tracer: { captureAWSv3Client: (c: any) => c },
    metrics: {
        addMetric: vi.fn(),
        publishStoredMetrics: vi.fn(),
        captureColdStartMetric: vi.fn(),
        setThrowOnEmptyMetrics: vi.fn(),
        setDefaultDimensions: vi.fn(),
    },
}));

const mockCreateInvoice = vi.fn();
const mockGetInvoice = vi.fn();
const mockListInvoicesByCustomer = vi.fn();
const mockUpdateInvoice = vi.fn();

vi.mock('../../../src/adapters/dynamo-invoice-repository', () => ({
    DynamoInvoiceRepository: vi.fn().mockImplementation(function () { return {}; }),
}));

vi.mock('../../../src/adapters/event-bridge-publisher', () => ({
    EventBridgePublisher: vi.fn().mockImplementation(function () { return {}; }),
}));

vi.mock('../../../src/application/invoice-service', () => ({
    InvoiceService: vi.fn().mockImplementation(function () {
        return {
            createInvoice: mockCreateInvoice,
            getInvoice: mockGetInvoice,
            listInvoicesByCustomer: mockListInvoicesByCustomer,
            updateInvoice: mockUpdateInvoice,
        };
    }),
}));

describe('Invoice Handlers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('create handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/invoices/create')).handler;
        });

        it('should return 201 when invoice is created with valid body', async () => {
            const mockInvoice = {
                invoiceId: 'inv-123',
                customerId: 'cust-123',
                invoiceNumber: 'INV-2026-001',
                invoiceDate: '2026-02-23',
                dueDate: '2026-03-23',
                subtotal: 10000,
                tax: 800,
                total: 10800,
            };
            mockCreateInvoice.mockResolvedValue(mockInvoice);

            const event = makeCreateEvent({
                customerId: 'cust-123',
                invoiceNumber: 'INV-2026-001',
                invoiceDate: '2026-02-23',
                dueDate: '2026-03-23',
                subtotal: 10000,
                tax: 800,
                total: 10800,
            });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(201);
            const body = JSON.parse(result.body);
            expect(body.invoiceId).toBe('inv-123');
            expect(body.customerId).toBe('cust-123');
            expect(body.invoiceNumber).toBe('INV-2026-001');
        });

        it('should return 400 when body is missing', async () => {
            const event = makeCreateEvent({});
            (event as any).body = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when required body fields are missing', async () => {
            const event = makeCreateEvent({ customerId: 'cust-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });

    describe('get handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/invoices/get')).handler;
        });

        it('should return 200 with invoice when valid invoiceId provided', async () => {
            const mockInvoice = {
                invoiceId: 'inv-123',
                customerId: 'cust-123',
                invoiceNumber: 'INV-2026-001',
            };
            mockGetInvoice.mockResolvedValue(mockInvoice);

            const event = makeGetEvent({ invoiceId: 'inv-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.invoiceId).toBe('inv-123');
        });

        it('should return 400 when invoiceId is missing', async () => {
            const event = makeGetEvent({ invoiceId: 'inv-123' });
            (event as any).pathParameters = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });

    describe('list handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/invoices/list')).handler;
        });

        it('should return 200 with invoices when valid customerId provided as query param', async () => {
            const mockList = { items: [{ invoiceId: 'inv-123', customerId: 'cust-123' }], cursor: undefined };
            mockListInvoicesByCustomer.mockResolvedValue(mockList);

            const event = makeListEvent({ customerId: 'cust-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.items).toHaveLength(1);
            expect(mockListInvoicesByCustomer).toHaveBeenCalledWith('cust-123', { limit: undefined, cursor: undefined });
        });

        it('should return 200 with pagination params passed to service', async () => {
            const mockList = { items: [{ invoiceId: 'inv-456' }], cursor: 'next-cursor' };
            mockListInvoicesByCustomer.mockResolvedValue(mockList);

            const event = makeListEvent({ customerId: 'cust-123', limit: '10', cursor: 'some-cursor' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            expect(mockListInvoicesByCustomer).toHaveBeenCalledWith('cust-123', { limit: 10, cursor: 'some-cursor' });
        });

        it('should return 400 when customerId query param is missing', async () => {
            const event = makeListEvent(null);
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });

    describe('update handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/invoices/update')).handler;
        });

        it('should return 200 when invoice is updated with valid data', async () => {
            const mockUpdated = { invoiceId: 'inv-123', status: 'sent' };
            mockUpdateInvoice.mockResolvedValue(mockUpdated);

            const event = makeUpdateEvent({ invoiceId: 'inv-123' }, { status: 'sent' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.invoiceId).toBe('inv-123');
        });

        it('should return 400 when invoiceId is missing', async () => {
            const event = makeUpdateEvent({ invoiceId: 'inv-123' }, { status: 'sent' });
            (event as any).pathParameters = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when body is missing', async () => {
            const event = makeUpdateEvent({ invoiceId: 'inv-123' }, {});
            (event as any).body = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });
});
