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

const mockCreatePropertyType = vi.fn();
const mockGetPropertyType = vi.fn();
const mockListPropertyTypes = vi.fn();
const mockUpdatePropertyType = vi.fn();
const mockDeletePropertyType = vi.fn();

vi.mock('../../../src/adapters/dynamo-property-type-repository', () => ({
    DynamoPropertyTypeRepository: vi.fn().mockImplementation(function () { return {}; }),
}));

vi.mock('../../../src/adapters/event-bridge-publisher', () => ({
    EventBridgePublisher: vi.fn().mockImplementation(function () { return {}; }),
}));

vi.mock('../../../src/application/property-type-service', () => ({
    PropertyTypeService: vi.fn().mockImplementation(function () {
        return {
            createPropertyType: mockCreatePropertyType,
            getPropertyType: mockGetPropertyType,
            listPropertyTypes: mockListPropertyTypes,
            updatePropertyType: mockUpdatePropertyType,
            deletePropertyType: mockDeletePropertyType,
        };
    }),
}));

describe('Property Type Handlers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('create handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/propertyTypes/create')).handler;
        });

        it('should return 201 when property type is created with valid body', async () => {
            const mockPropertyType = {
                propertyTypeId: 'pt-123',
                name: 'Residential',
                description: 'Single-family residential property',
            };
            mockCreatePropertyType.mockResolvedValue(mockPropertyType);

            const event = makeCreateEvent({ name: 'Residential', description: 'Single-family residential property' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(201);
            const body = JSON.parse(result.body);
            expect(body.propertyTypeId).toBe('pt-123');
            expect(body.name).toBe('Residential');
        });

        it('should return 201 when property type is created with only required name field', async () => {
            const mockPropertyType = { propertyTypeId: 'pt-456', name: 'Commercial' };
            mockCreatePropertyType.mockResolvedValue(mockPropertyType);

            const event = makeCreateEvent({ name: 'Commercial' });
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
            handler = (await import('../../../src/handlers/propertyTypes/get')).handler;
        });

        it('should return 200 with property type when valid propertyTypeId provided', async () => {
            const mockPropertyType = { propertyTypeId: 'pt-123', name: 'Residential' };
            mockGetPropertyType.mockResolvedValue(mockPropertyType);

            const event = makeGetEvent({ propertyTypeId: 'pt-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.propertyTypeId).toBe('pt-123');
            expect(body.name).toBe('Residential');
        });

        it('should return 400 when propertyTypeId is missing', async () => {
            const event = makeGetEvent({ propertyTypeId: 'pt-123' });
            (event as any).pathParameters = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });

    describe('list handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/propertyTypes/list')).handler;
        });

        it('should return 200 with property types when no params provided', async () => {
            const mockList = { items: [{ propertyTypeId: 'pt-123', name: 'Residential' }], cursor: undefined };
            mockListPropertyTypes.mockResolvedValue(mockList);

            const event = makeListEvent();
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.items).toHaveLength(1);
        });

        it('should return 200 with property types when limit and cursor params provided', async () => {
            const mockList = { items: [{ propertyTypeId: 'pt-456', name: 'Commercial' }], cursor: 'next-cursor' };
            mockListPropertyTypes.mockResolvedValue(mockList);

            const event = makeListEvent({ limit: '10', cursor: 'some-cursor' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            expect(mockListPropertyTypes).toHaveBeenCalledWith('org-test-123', { limit: 10, cursor: 'some-cursor' });
        });
    });

    describe('update handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/propertyTypes/update')).handler;
        });

        it('should return 200 when property type is updated with valid data', async () => {
            const mockUpdated = { propertyTypeId: 'pt-123', name: 'Updated Residential' };
            mockUpdatePropertyType.mockResolvedValue(mockUpdated);

            const event = makeUpdateEvent({ propertyTypeId: 'pt-123' }, { name: 'Updated Residential' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.propertyTypeId).toBe('pt-123');
        });

        it('should return 400 when propertyTypeId is missing', async () => {
            const event = makeUpdateEvent({ propertyTypeId: 'pt-123' }, { name: 'Updated Residential' });
            (event as any).pathParameters = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when body is missing', async () => {
            const event = makeUpdateEvent({ propertyTypeId: 'pt-123' }, {});
            (event as any).body = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });

    describe('delete handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/propertyTypes/delete')).handler;
        });

        it('should return 200 when property type is deleted', async () => {
            mockDeletePropertyType.mockResolvedValue(undefined);

            const event = makeDeleteEvent({ propertyTypeId: 'pt-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.message).toBe('Property type deleted');
        });

        it('should return 400 when propertyTypeId is missing', async () => {
            const event = makeDeleteEvent({ propertyTypeId: 'pt-123' });
            (event as any).pathParameters = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });
});
