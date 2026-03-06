import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeCreateEvent, makeGetEvent, makeListEvent, makeUpdateEvent, makeDeleteEvent, mockContext } from '../../helpers/test-utils';

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

const mockGenerateEstimate = vi.fn();
const mockGetEstimate = vi.fn();
const mockListEstimatesByCustomer = vi.fn();
const mockUpdateEstimate = vi.fn();
const mockDeleteEstimate = vi.fn();
const mockConvertToInvoice = vi.fn();

vi.mock('../../../src/adapters/dynamo-estimate-repository', () => ({
    DynamoEstimateRepository: vi.fn().mockImplementation(function () { return {}; }),
}));

vi.mock('../../../src/adapters/dynamo-property-repository', () => ({
    DynamoPropertyRepository: vi.fn().mockImplementation(function () { return {}; }),
}));

vi.mock('../../../src/adapters/dynamo-service-type-repository', () => ({
    DynamoServiceTypeRepository: vi.fn().mockImplementation(function () { return {}; }),
}));

vi.mock('../../../src/adapters/dynamo-plan-service-repository', () => ({
    DynamoPlanServiceRepository: vi.fn().mockImplementation(function () { return {}; }),
}));

vi.mock('../../../src/adapters/dynamo-invoice-repository', () => ({
    DynamoInvoiceRepository: vi.fn().mockImplementation(function () { return {}; }),
}));

vi.mock('../../../src/adapters/event-bridge-publisher', () => ({
    EventBridgePublisher: vi.fn().mockImplementation(function () { return {}; }),
}));

vi.mock('../../../src/application/estimate-service', () => ({
    EstimateService: vi.fn().mockImplementation(function () {
        return {
            generateEstimate: mockGenerateEstimate,
            getEstimate: mockGetEstimate,
            listEstimatesByCustomer: mockListEstimatesByCustomer,
            updateEstimate: mockUpdateEstimate,
            deleteEstimate: mockDeleteEstimate,
            convertToInvoice: mockConvertToInvoice,
        };
    }),
}));

describe('Estimate Handlers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('create handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/estimates/create')).handler;
        });

        it('should return 201 when estimate is generated with valid body', async () => {
            const mockEstimate = {
                estimateId: 'est-123',
                customerId: 'cust-1',
                propertyId: 'prop-1',
                status: 'draft',
                subtotal: 25000,
                total: 25000,
            };
            mockGenerateEstimate.mockResolvedValue(mockEstimate);

            const event = makeCreateEvent({
                customerId: 'cust-1',
                propertyId: 'prop-1',
                serviceTypeIds: ['st-1'],
            });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(201);
            const body = JSON.parse(result.body);
            expect(body.estimateId).toBe('est-123');
            expect(body.status).toBe('draft');
        });

        it('should return 400 when body is missing', async () => {
            const event = makeCreateEvent({});
            (event as any).body = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when required fields are missing', async () => {
            const event = makeCreateEvent({ customerId: 'cust-1' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });

    describe('get handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/estimates/get')).handler;
        });

        it('should return 200 with estimate when valid estimateId provided', async () => {
            const mockEstimate = { estimateId: 'est-123', status: 'draft' };
            mockGetEstimate.mockResolvedValue(mockEstimate);

            const event = makeGetEvent({ estimateId: 'est-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.estimateId).toBe('est-123');
        });

        it('should return 400 when estimateId is missing', async () => {
            const event = makeGetEvent({ estimateId: 'est-123' });
            (event as any).pathParameters = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });

    describe('list handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/estimates/list')).handler;
        });

        it('should return 200 with estimates when valid customerId provided', async () => {
            const mockList = { items: [{ estimateId: 'est-123' }], cursor: null };
            mockListEstimatesByCustomer.mockResolvedValue(mockList);

            const event = makeListEvent({ customerId: 'cust-1' });
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

        it('should pass pagination params', async () => {
            const mockList = { items: [], cursor: 'next' };
            mockListEstimatesByCustomer.mockResolvedValue(mockList);

            const event = makeListEvent({ customerId: 'cust-1', limit: '5', cursor: 'prev' });
            await handler(event, mockContext);

            expect(mockListEstimatesByCustomer).toHaveBeenCalledWith('org-test-123', 'cust-1', { limit: 5, cursor: 'prev' });
        });
    });

    describe('update handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/estimates/update')).handler;
        });

        it('should return 200 when estimate is updated', async () => {
            const mockUpdated = { estimateId: 'est-123', status: 'sent' };
            mockUpdateEstimate.mockResolvedValue(mockUpdated);

            const event = makeUpdateEvent({ estimateId: 'est-123' }, { status: 'sent' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.status).toBe('sent');
        });

        it('should return 400 when estimateId is missing', async () => {
            const event = makeUpdateEvent({ estimateId: 'est-123' }, { status: 'sent' });
            (event as any).pathParameters = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when body is missing', async () => {
            const event = makeUpdateEvent({ estimateId: 'est-123' }, {});
            (event as any).body = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });

    describe('delete handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/estimates/delete')).handler;
        });

        it('should return 200 when estimate is deleted', async () => {
            mockDeleteEstimate.mockResolvedValue(undefined);

            const event = makeDeleteEvent({ estimateId: 'est-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.message).toBe('Estimate deleted');
        });

        it('should return 400 when estimateId is missing', async () => {
            const event = makeDeleteEvent({ estimateId: 'est-123' });
            (event as any).pathParameters = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });

    describe('convertToInvoice handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/estimates/convertToInvoice')).handler;
        });

        it('should return 201 when estimate is converted to invoice', async () => {
            const mockResult = {
                estimate: { estimateId: 'est-123', status: 'invoiced', invoiceId: 'inv-1' },
                invoiceId: 'inv-1',
            };
            mockConvertToInvoice.mockResolvedValue(mockResult);

            const event = makeCreateEvent({}, { estimateId: 'est-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(201);
            const body = JSON.parse(result.body);
            expect(body.invoiceId).toBe('inv-1');
        });

        it('should return 400 when estimateId is missing', async () => {
            const event = makeCreateEvent({});
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });
});
