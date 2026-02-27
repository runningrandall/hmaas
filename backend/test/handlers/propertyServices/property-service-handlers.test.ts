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

const mockCreatePropertyService = vi.fn();
const mockGetPropertyService = vi.fn();
const mockListPropertyServicesByProperty = vi.fn();
const mockUpdatePropertyService = vi.fn();
const mockDeletePropertyService = vi.fn();

vi.mock('../../../src/adapters/dynamo-property-service-repository', () => ({
    DynamoPropertyServiceRepository: vi.fn().mockImplementation(function () { return {}; }),
}));

vi.mock('../../../src/adapters/event-bridge-publisher', () => ({
    EventBridgePublisher: vi.fn().mockImplementation(function () { return {}; }),
}));

vi.mock('../../../src/application/property-service-service', () => ({
    PropertyServiceService: vi.fn().mockImplementation(function () {
        return {
            createPropertyService: mockCreatePropertyService,
            getPropertyService: mockGetPropertyService,
            listPropertyServicesByProperty: mockListPropertyServicesByProperty,
            updatePropertyService: mockUpdatePropertyService,
            deletePropertyService: mockDeletePropertyService,
        };
    }),
}));

describe('Property Service Handlers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('create handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/propertyServices/create')).handler;
        });

        it('should return 201 when property service is created with valid body', async () => {
            const mockService = {
                serviceId: 'svc-123',
                propertyId: 'prop-456',
                serviceTypeId: 'svc-type-789',
                status: 'active',
            };
            mockCreatePropertyService.mockResolvedValue(mockService);

            const event = makeCreateEvent({ propertyId: 'prop-456', serviceTypeId: 'svc-type-789' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(201);
            const body = JSON.parse(result.body);
            expect(body.serviceId).toBe('svc-123');
            expect(body.propertyId).toBe('prop-456');
        });

        it('should return 400 when body is missing', async () => {
            const event = makeCreateEvent({});
            (event as any).body = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when required fields are missing', async () => {
            const event = makeCreateEvent({ propertyId: 'prop-456' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });

    describe('get handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/propertyServices/get')).handler;
        });

        it('should return 200 with property service when valid serviceId provided', async () => {
            const mockService = {
                serviceId: 'svc-123',
                propertyId: 'prop-456',
                serviceTypeId: 'svc-type-789',
                status: 'active',
            };
            mockGetPropertyService.mockResolvedValue(mockService);

            const event = makeGetEvent({ serviceId: 'svc-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.serviceId).toBe('svc-123');
            expect(body.propertyId).toBe('prop-456');
        });

        it('should return 400 when serviceId is missing', async () => {
            const event = makeGetEvent({ serviceId: 'svc-123' });
            (event as any).pathParameters = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });

    describe('listByProperty handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/propertyServices/listByProperty')).handler;
        });

        it('should return 200 with property services when valid propertyId provided', async () => {
            const mockList = {
                items: [{ serviceId: 'svc-123', propertyId: 'prop-456', serviceTypeId: 'svc-type-789' }],
                cursor: undefined,
            };
            mockListPropertyServicesByProperty.mockResolvedValue(mockList);

            const event = makeListEvent(null, { propertyId: 'prop-456' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.items).toHaveLength(1);
            expect(mockListPropertyServicesByProperty).toHaveBeenCalledWith('org-test-123', 'prop-456', { limit: undefined, cursor: undefined });
        });

        it('should return 400 when propertyId is missing', async () => {
            const event = makeListEvent(null, null);
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 200 when limit and cursor params are provided', async () => {
            const mockList = {
                items: [{ serviceId: 'svc-456', propertyId: 'prop-456', serviceTypeId: 'svc-type-999' }],
                cursor: 'next-cursor',
            };
            mockListPropertyServicesByProperty.mockResolvedValue(mockList);

            const event = makeListEvent({ limit: '5', cursor: 'some-cursor' }, { propertyId: 'prop-456' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            expect(mockListPropertyServicesByProperty).toHaveBeenCalledWith('org-test-123', 'prop-456', { limit: 5, cursor: 'some-cursor' });
        });
    });

    describe('update handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/propertyServices/update')).handler;
        });

        it('should return 200 when property service is updated with valid data', async () => {
            const mockUpdated = {
                serviceId: 'svc-123',
                propertyId: 'prop-456',
                status: 'inactive',
            };
            mockUpdatePropertyService.mockResolvedValue(mockUpdated);

            const event = makeUpdateEvent({ serviceId: 'svc-123' }, { status: 'inactive' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.serviceId).toBe('svc-123');
            expect(body.status).toBe('inactive');
        });

        it('should return 400 when serviceId is missing', async () => {
            const event = makeUpdateEvent({ serviceId: 'svc-123' }, { status: 'inactive' });
            (event as any).pathParameters = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when body is missing', async () => {
            const event = makeUpdateEvent({ serviceId: 'svc-123' }, {});
            (event as any).body = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });

    describe('delete handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/propertyServices/delete')).handler;
        });

        it('should return 204 when property service is deleted', async () => {
            mockDeletePropertyService.mockResolvedValue(undefined);

            const event = makeDeleteEvent({ serviceId: 'svc-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(204);
            expect(result.body).toBe('');
        });

        it('should return 400 when serviceId is missing', async () => {
            const event = makeDeleteEvent({ serviceId: 'svc-123' });
            (event as any).pathParameters = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });
});
