import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeCreateEvent, makeListEvent, makeUpdateEvent, makeDeleteEvent, mockContext } from '../../helpers/test-utils';

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

const mockCreateInvoiceSchedule = vi.fn();
const mockListInvoiceSchedulesByCustomer = vi.fn();
const mockUpdateInvoiceSchedule = vi.fn();
const mockDeleteInvoiceSchedule = vi.fn();

vi.mock('../../../src/adapters/dynamo-invoice-schedule-repository', () => ({
    DynamoInvoiceScheduleRepository: vi.fn().mockImplementation(function () { return {}; }),
}));

vi.mock('../../../src/adapters/event-bridge-publisher', () => ({
    EventBridgePublisher: vi.fn().mockImplementation(function () { return {}; }),
}));

vi.mock('../../../src/application/invoice-schedule-service', () => ({
    InvoiceScheduleService: vi.fn().mockImplementation(function () {
        return {
            createInvoiceSchedule: mockCreateInvoiceSchedule,
            listInvoiceSchedulesByCustomer: mockListInvoiceSchedulesByCustomer,
            updateInvoiceSchedule: mockUpdateInvoiceSchedule,
            deleteInvoiceSchedule: mockDeleteInvoiceSchedule,
        };
    }),
}));

describe('Invoice Schedule Handlers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('create handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/invoiceSchedules/create')).handler;
        });

        it('should return 201 when invoice schedule is created with valid body', async () => {
            const mockSchedule = {
                invoiceScheduleId: 'is-123',
                customerId: 'cust-123',
                frequency: 'monthly',
                nextInvoiceDate: '2026-03-01',
            };
            mockCreateInvoiceSchedule.mockResolvedValue(mockSchedule);

            const event = makeCreateEvent(
                { frequency: 'monthly', nextInvoiceDate: '2026-03-01' },
                { customerId: 'cust-123' },
            );
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(201);
            const body = JSON.parse(result.body);
            expect(body.invoiceScheduleId).toBe('is-123');
            expect(body.frequency).toBe('monthly');
        });

        it('should return 400 when customerId path param is missing', async () => {
            const event = makeCreateEvent({ frequency: 'monthly', nextInvoiceDate: '2026-03-01' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when body is missing', async () => {
            const event = makeCreateEvent({}, { customerId: 'cust-123' });
            (event as any).body = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when required fields are missing', async () => {
            const event = makeCreateEvent({ frequency: 'monthly' }, { customerId: 'cust-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when frequency is invalid', async () => {
            const event = makeCreateEvent(
                { frequency: 'weekly', nextInvoiceDate: '2026-03-01' },
                { customerId: 'cust-123' },
            );
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should call createInvoiceSchedule with customerId and parsed data', async () => {
            const mockSchedule = { invoiceScheduleId: 'is-456', customerId: 'cust-456', frequency: 'annually', nextInvoiceDate: '2027-01-01' };
            mockCreateInvoiceSchedule.mockResolvedValue(mockSchedule);

            const event = makeCreateEvent(
                { frequency: 'annually', nextInvoiceDate: '2027-01-01' },
                { customerId: 'cust-456' },
            );
            await handler(event, mockContext);

            expect(mockCreateInvoiceSchedule).toHaveBeenCalledWith(
                'org-test-123',
                expect.objectContaining({ frequency: 'annually', nextInvoiceDate: '2027-01-01', customerId: 'cust-456' }),
            );
        });
    });

    describe('list handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/invoiceSchedules/list')).handler;
        });

        it('should return 200 with invoice schedules when valid customerId provided', async () => {
            const mockList = { items: [{ invoiceScheduleId: 'is-123', customerId: 'cust-123' }], cursor: undefined };
            mockListInvoiceSchedulesByCustomer.mockResolvedValue(mockList);

            const event = makeListEvent(null, { customerId: 'cust-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.items).toHaveLength(1);
        });

        it('should return 400 when customerId is missing', async () => {
            const event = makeListEvent();
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should pass limit and cursor to service', async () => {
            const mockList = { items: [], cursor: 'next-cursor' };
            mockListInvoiceSchedulesByCustomer.mockResolvedValue(mockList);

            const event = makeListEvent({ limit: '5', cursor: 'some-cursor' }, { customerId: 'cust-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            expect(mockListInvoiceSchedulesByCustomer).toHaveBeenCalledWith('org-test-123', 'cust-123', { limit: 5, cursor: 'some-cursor' });
        });
    });

    describe('update handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/invoiceSchedules/update')).handler;
        });

        it('should return 200 when invoice schedule is updated', async () => {
            const mockUpdated = { invoiceScheduleId: 'is-123', frequency: 'quarterly' };
            mockUpdateInvoiceSchedule.mockResolvedValue(mockUpdated);

            const event = makeUpdateEvent({ invoiceScheduleId: 'is-123' }, { frequency: 'quarterly' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.invoiceScheduleId).toBe('is-123');
        });

        it('should return 400 when invoiceScheduleId is missing', async () => {
            const event = makeUpdateEvent({ invoiceScheduleId: 'is-123' }, { frequency: 'quarterly' });
            (event as any).pathParameters = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when body is missing', async () => {
            const event = makeUpdateEvent({ invoiceScheduleId: 'is-123' }, {});
            (event as any).body = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when frequency is invalid', async () => {
            const event = makeUpdateEvent({ invoiceScheduleId: 'is-123' }, { frequency: 'daily' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });

    describe('delete handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/invoiceSchedules/delete')).handler;
        });

        it('should return 200 with message when invoice schedule is deleted', async () => {
            mockDeleteInvoiceSchedule.mockResolvedValue(undefined);

            const event = makeDeleteEvent({ invoiceScheduleId: 'is-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.message).toBe('Invoice schedule deleted');
        });

        it('should return 400 when invoiceScheduleId is missing', async () => {
            const event = makeDeleteEvent({ invoiceScheduleId: 'is-123' });
            (event as any).pathParameters = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should call deleteInvoiceSchedule with the correct id', async () => {
            mockDeleteInvoiceSchedule.mockResolvedValue(undefined);

            const event = makeDeleteEvent({ invoiceScheduleId: 'is-789' });
            await handler(event, mockContext);

            expect(mockDeleteInvoiceSchedule).toHaveBeenCalledWith('org-test-123', 'is-789');
        });
    });
});
