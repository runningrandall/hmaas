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

const mockCreateCostType = vi.fn();
const mockGetCostType = vi.fn();
const mockListCostTypes = vi.fn();
const mockUpdateCostType = vi.fn();
const mockDeleteCostType = vi.fn();

vi.mock('../../../src/adapters/dynamo-cost-type-repository', () => ({
    DynamoCostTypeRepository: vi.fn().mockImplementation(function () { return {}; }),
}));

vi.mock('../../../src/adapters/event-bridge-publisher', () => ({
    EventBridgePublisher: vi.fn().mockImplementation(function () { return {}; }),
}));

vi.mock('../../../src/application/cost-type-service', () => ({
    CostTypeService: vi.fn().mockImplementation(function () {
        return {
            createCostType: mockCreateCostType,
            getCostType: mockGetCostType,
            listCostTypes: mockListCostTypes,
            updateCostType: mockUpdateCostType,
            deleteCostType: mockDeleteCostType,
        };
    }),
}));

describe('Cost Type Handlers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('create handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/costTypes/create')).handler;
        });

        it('should return 201 when cost type is created with valid body', async () => {
            const mockCostType = {
                costTypeId: 'ct-123',
                name: 'One-Time',
                description: 'One-time service charge',
            };
            mockCreateCostType.mockResolvedValue(mockCostType);

            const event = makeCreateEvent({ name: 'One-Time', description: 'One-time service charge' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(201);
            const body = JSON.parse(result.body);
            expect(body.costTypeId).toBe('ct-123');
            expect(body.name).toBe('One-Time');
        });

        it('should return 201 when cost type is created with only required name field', async () => {
            const mockCostType = { costTypeId: 'ct-456', name: 'Recurring' };
            mockCreateCostType.mockResolvedValue(mockCostType);

            const event = makeCreateEvent({ name: 'Recurring' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(201);
        });

        it('should return 201 when cost type is created with optional description', async () => {
            const mockCostType = {
                costTypeId: 'ct-789',
                name: 'Seasonal',
                description: 'Seasonal service charge applied quarterly',
            };
            mockCreateCostType.mockResolvedValue(mockCostType);

            const event = makeCreateEvent({ name: 'Seasonal', description: 'Seasonal service charge applied quarterly' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(201);
        });

        it('should return 400 when body is missing', async () => {
            const event = makeCreateEvent({});
            (event as any).body = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when required name field is missing', async () => {
            const event = makeCreateEvent({ description: 'Some description' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });

    describe('get handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/costTypes/get')).handler;
        });

        it('should return 200 with cost type when valid costTypeId provided', async () => {
            const mockCostType = {
                costTypeId: 'ct-123',
                name: 'One-Time',
                description: 'One-time service charge',
            };
            mockGetCostType.mockResolvedValue(mockCostType);

            const event = makeGetEvent({ costTypeId: 'ct-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.costTypeId).toBe('ct-123');
            expect(body.name).toBe('One-Time');
        });

        it('should return 400 when costTypeId is missing', async () => {
            const event = makeGetEvent({ costTypeId: 'ct-123' });
            (event as any).pathParameters = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });

    describe('list handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/costTypes/list')).handler;
        });

        it('should return 200 with cost types when no params provided', async () => {
            const mockList = {
                items: [{ costTypeId: 'ct-123', name: 'One-Time' }],
                cursor: undefined,
            };
            mockListCostTypes.mockResolvedValue(mockList);

            const event = makeListEvent();
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.items).toHaveLength(1);
        });

        it('should return 200 with cost types when limit and cursor params provided', async () => {
            const mockList = {
                items: [{ costTypeId: 'ct-456', name: 'Recurring' }],
                cursor: 'next-cursor',
            };
            mockListCostTypes.mockResolvedValue(mockList);

            const event = makeListEvent({ limit: '15', cursor: 'some-cursor' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            expect(mockListCostTypes).toHaveBeenCalledWith('org-test-123', { limit: 15, cursor: 'some-cursor' });
        });
    });

    describe('update handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/costTypes/update')).handler;
        });

        it('should return 200 when cost type is updated with valid data', async () => {
            const mockUpdated = { costTypeId: 'ct-123', name: 'Updated One-Time' };
            mockUpdateCostType.mockResolvedValue(mockUpdated);

            const event = makeUpdateEvent({ costTypeId: 'ct-123' }, { name: 'Updated One-Time' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.costTypeId).toBe('ct-123');
        });

        it('should return 400 when costTypeId is missing', async () => {
            const event = makeUpdateEvent({ costTypeId: 'ct-123' }, { name: 'Updated One-Time' });
            (event as any).pathParameters = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when body is missing', async () => {
            const event = makeUpdateEvent({ costTypeId: 'ct-123' }, {});
            (event as any).body = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });

    describe('delete handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/costTypes/delete')).handler;
        });

        it('should return 200 when cost type is deleted', async () => {
            mockDeleteCostType.mockResolvedValue(undefined);

            const event = makeDeleteEvent({ costTypeId: 'ct-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.message).toBe('Cost type deleted');
        });

        it('should return 400 when costTypeId is missing', async () => {
            const event = makeDeleteEvent({ costTypeId: 'ct-123' });
            (event as any).pathParameters = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });
});
