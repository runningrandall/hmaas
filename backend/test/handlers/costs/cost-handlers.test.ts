import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeCreateEvent, makeListEvent, makeDeleteEvent, mockContext } from '../../helpers/test-utils';

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

const mockCreateCost = vi.fn();
const mockListCostsByService = vi.fn();
const mockDeleteCost = vi.fn();

vi.mock('../../../src/adapters/dynamo-cost-repository', () => ({
    DynamoCostRepository: vi.fn().mockImplementation(function () { return {}; }),
}));

vi.mock('../../../src/adapters/event-bridge-publisher', () => ({
    EventBridgePublisher: vi.fn().mockImplementation(function () { return {}; }),
}));

vi.mock('../../../src/application/cost-service', () => ({
    CostService: vi.fn().mockImplementation(function () {
        return {
            createCost: mockCreateCost,
            listCostsByService: mockListCostsByService,
            deleteCost: mockDeleteCost,
        };
    }),
}));

describe('Cost Handlers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('create handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/costs/create')).handler;
        });

        it('should return 201 when cost is created with valid body', async () => {
            const mockCost = {
                costId: 'cost-123',
                serviceId: 'svc-456',
                costTypeId: 'cost-type-789',
                amount: 5000,
            };
            mockCreateCost.mockResolvedValue(mockCost);

            const event = makeCreateEvent({ costTypeId: 'cost-type-789', amount: 5000 }, { serviceId: 'svc-456' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(201);
            const body = JSON.parse(result.body);
            expect(body.costId).toBe('cost-123');
            expect(body.amount).toBe(5000);
        });

        it('should return 400 when serviceId path param is missing', async () => {
            const event = makeCreateEvent({ costTypeId: 'cost-type-789', amount: 5000 });
            (event as any).pathParameters = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when body is missing', async () => {
            const event = makeCreateEvent({}, { serviceId: 'svc-456' });
            (event as any).body = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when required fields are missing from body', async () => {
            const event = makeCreateEvent({ costTypeId: 'cost-type-789' }, { serviceId: 'svc-456' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when amount is not an integer', async () => {
            const event = makeCreateEvent({ costTypeId: 'cost-type-789', amount: 50.99 }, { serviceId: 'svc-456' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });

    describe('listByService handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/costs/listByService')).handler;
        });

        it('should return 200 with costs when valid serviceId provided', async () => {
            const mockList = {
                items: [{ costId: 'cost-123', serviceId: 'svc-456', amount: 5000 }],
                cursor: undefined,
            };
            mockListCostsByService.mockResolvedValue(mockList);

            const event = makeListEvent(null, { serviceId: 'svc-456' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.items).toHaveLength(1);
            expect(mockListCostsByService).toHaveBeenCalledWith('svc-456', { limit: undefined, cursor: undefined });
        });

        it('should return 400 when serviceId is missing', async () => {
            const event = makeListEvent(null, null);
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 200 when limit and cursor params are provided', async () => {
            const mockList = {
                items: [{ costId: 'cost-456', serviceId: 'svc-456', amount: 2500 }],
                cursor: 'next-cursor',
            };
            mockListCostsByService.mockResolvedValue(mockList);

            const event = makeListEvent({ limit: '10', cursor: 'some-cursor' }, { serviceId: 'svc-456' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            expect(mockListCostsByService).toHaveBeenCalledWith('svc-456', { limit: 10, cursor: 'some-cursor' });
        });
    });

    describe('delete handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/costs/delete')).handler;
        });

        it('should return 204 when cost is deleted', async () => {
            mockDeleteCost.mockResolvedValue(undefined);

            const event = makeDeleteEvent({ costId: 'cost-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(204);
            expect(result.body).toBe('');
        });

        it('should return 400 when costId is missing', async () => {
            const event = makeDeleteEvent({ costId: 'cost-123' });
            (event as any).pathParameters = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });
});
