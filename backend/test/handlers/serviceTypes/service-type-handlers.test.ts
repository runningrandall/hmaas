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

const mockCreateServiceType = vi.fn();
const mockGetServiceType = vi.fn();
const mockListServiceTypes = vi.fn();
const mockUpdateServiceType = vi.fn();
const mockDeleteServiceType = vi.fn();

vi.mock('../../../src/adapters/dynamo-service-type-repository', () => ({
    DynamoServiceTypeRepository: vi.fn().mockImplementation(function () { return {}; }),
}));

vi.mock('../../../src/adapters/event-bridge-publisher', () => ({
    EventBridgePublisher: vi.fn().mockImplementation(function () { return {}; }),
}));

vi.mock('../../../src/application/service-type-service', () => ({
    ServiceTypeService: vi.fn().mockImplementation(function () {
        return {
            createServiceType: mockCreateServiceType,
            getServiceType: mockGetServiceType,
            listServiceTypes: mockListServiceTypes,
            updateServiceType: mockUpdateServiceType,
            deleteServiceType: mockDeleteServiceType,
        };
    }),
}));

describe('Service Type Handlers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('create handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/serviceTypes/create')).handler;
        });

        it('should return 201 when service type is created with valid body', async () => {
            const mockServiceType = {
                serviceTypeId: 'st-123',
                name: 'Lawn Care',
                description: 'Regular lawn mowing and edging',
                category: 'Outdoor',
            };
            mockCreateServiceType.mockResolvedValue(mockServiceType);

            const event = makeCreateEvent({
                name: 'Lawn Care',
                description: 'Regular lawn mowing and edging',
                category: 'Outdoor',
            });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(201);
            const body = JSON.parse(result.body);
            expect(body.serviceTypeId).toBe('st-123');
            expect(body.name).toBe('Lawn Care');
        });

        it('should return 201 when service type is created with only required name field', async () => {
            const mockServiceType = { serviceTypeId: 'st-456', name: 'Window Cleaning' };
            mockCreateServiceType.mockResolvedValue(mockServiceType);

            const event = makeCreateEvent({ name: 'Window Cleaning' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(201);
        });

        it('should return 201 when service type is created with optional description', async () => {
            const mockServiceType = {
                serviceTypeId: 'st-789',
                name: 'Pest Control',
                description: 'Monthly pest control treatment',
            };
            mockCreateServiceType.mockResolvedValue(mockServiceType);

            const event = makeCreateEvent({ name: 'Pest Control', description: 'Monthly pest control treatment' });
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
            const event = makeCreateEvent({ description: 'Some description', category: 'Outdoor' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });

    describe('get handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/serviceTypes/get')).handler;
        });

        it('should return 200 with service type when valid serviceTypeId provided', async () => {
            const mockServiceType = {
                serviceTypeId: 'st-123',
                name: 'Lawn Care',
                category: 'Outdoor',
            };
            mockGetServiceType.mockResolvedValue(mockServiceType);

            const event = makeGetEvent({ serviceTypeId: 'st-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.serviceTypeId).toBe('st-123');
            expect(body.name).toBe('Lawn Care');
        });

        it('should return 400 when serviceTypeId is missing', async () => {
            const event = makeGetEvent({ serviceTypeId: 'st-123' });
            (event as any).pathParameters = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });

    describe('list handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/serviceTypes/list')).handler;
        });

        it('should return 200 with service types when no params provided', async () => {
            const mockList = {
                items: [{ serviceTypeId: 'st-123', name: 'Lawn Care' }],
                cursor: undefined,
            };
            mockListServiceTypes.mockResolvedValue(mockList);

            const event = makeListEvent();
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.items).toHaveLength(1);
        });

        it('should return 200 with service types when limit and cursor params provided', async () => {
            const mockList = {
                items: [{ serviceTypeId: 'st-456', name: 'Window Cleaning' }],
                cursor: 'next-cursor',
            };
            mockListServiceTypes.mockResolvedValue(mockList);

            const event = makeListEvent({ limit: '20', cursor: 'some-cursor' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            expect(mockListServiceTypes).toHaveBeenCalledWith('org-test-123', { limit: 20, cursor: 'some-cursor' });
        });
    });

    describe('update handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/serviceTypes/update')).handler;
        });

        it('should return 200 when service type is updated with valid data', async () => {
            const mockUpdated = { serviceTypeId: 'st-123', name: 'Premium Lawn Care', category: 'Outdoor' };
            mockUpdateServiceType.mockResolvedValue(mockUpdated);

            const event = makeUpdateEvent({ serviceTypeId: 'st-123' }, { name: 'Premium Lawn Care' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.serviceTypeId).toBe('st-123');
        });

        it('should return 400 when serviceTypeId is missing', async () => {
            const event = makeUpdateEvent({ serviceTypeId: 'st-123' }, { name: 'Premium Lawn Care' });
            (event as any).pathParameters = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when body is missing', async () => {
            const event = makeUpdateEvent({ serviceTypeId: 'st-123' }, {});
            (event as any).body = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });

    describe('delete handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/serviceTypes/delete')).handler;
        });

        it('should return 204 when service type is deleted', async () => {
            mockDeleteServiceType.mockResolvedValue(undefined);

            const event = makeDeleteEvent({ serviceTypeId: 'st-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(204);
        });

        it('should return 400 when serviceTypeId is missing', async () => {
            const event = makeDeleteEvent({ serviceTypeId: 'st-123' });
            (event as any).pathParameters = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });
});
