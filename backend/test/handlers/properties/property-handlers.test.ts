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

const mockCreateProperty = vi.fn();
const mockGetProperty = vi.fn();
const mockListPropertiesByCustomer = vi.fn();
const mockUpdateProperty = vi.fn();
const mockDeleteProperty = vi.fn();

vi.mock('../../../src/adapters/dynamo-property-repository', () => ({
    DynamoPropertyRepository: vi.fn().mockImplementation(function () { return {}; }),
}));

vi.mock('../../../src/adapters/event-bridge-publisher', () => ({
    EventBridgePublisher: vi.fn().mockImplementation(function () { return {}; }),
}));

vi.mock('../../../src/application/property-service', () => ({
    PropertyService: vi.fn().mockImplementation(function () {
        return {
            createProperty: mockCreateProperty,
            getProperty: mockGetProperty,
            listPropertiesByCustomer: mockListPropertiesByCustomer,
            updateProperty: mockUpdateProperty,
            deleteProperty: mockDeleteProperty,
        };
    }),
}));

describe('Property Handlers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('create handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/properties/create')).handler;
        });

        it('should return 201 when property is created with valid body', async () => {
            const mockProperty = {
                propertyId: 'prop-123',
                customerId: 'cust-123',
                propertyTypeId: 'pt-residential',
                name: 'Main Residence',
                address: '123 Main St',
                city: 'Denver',
                state: 'CO',
                zip: '80202',
            };
            mockCreateProperty.mockResolvedValue(mockProperty);

            const event = makeCreateEvent(
                {
                    propertyTypeId: 'pt-residential',
                    name: 'Main Residence',
                    address: '123 Main St',
                    city: 'Denver',
                    state: 'CO',
                    zip: '80202',
                },
                { customerId: 'cust-123' },
            );
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(201);
            const body = JSON.parse(result.body);
            expect(body.propertyId).toBe('prop-123');
            expect(body.customerId).toBe('cust-123');
        });

        it('should return 400 when customerId path param is missing', async () => {
            const event = makeCreateEvent({
                propertyTypeId: 'pt-residential',
                name: 'Main Residence',
                address: '123 Main St',
                city: 'Denver',
                state: 'CO',
                zip: '80202',
            });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when body is missing', async () => {
            const event = makeCreateEvent({}, { customerId: 'cust-123' });
            (event as any).body = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when required body fields are missing', async () => {
            const event = makeCreateEvent(
                { propertyTypeId: 'pt-residential' },
                { customerId: 'cust-123' },
            );
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });

    describe('get handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/properties/get')).handler;
        });

        it('should return 200 with property when valid propertyId provided', async () => {
            const mockProperty = {
                propertyId: 'prop-123',
                customerId: 'cust-123',
                name: 'Main Residence',
            };
            mockGetProperty.mockResolvedValue(mockProperty);

            const event = makeGetEvent({ propertyId: 'prop-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.propertyId).toBe('prop-123');
        });

        it('should return 400 when propertyId is missing', async () => {
            const event = makeGetEvent({ propertyId: 'prop-123' });
            (event as any).pathParameters = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });

    describe('listByCustomer handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/properties/listByCustomer')).handler;
        });

        it('should return 200 with properties when valid customerId provided', async () => {
            const mockList = { items: [{ propertyId: 'prop-123', customerId: 'cust-123' }], cursor: undefined };
            mockListPropertiesByCustomer.mockResolvedValue(mockList);

            const event = makeListEvent(null, { customerId: 'cust-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.items).toHaveLength(1);
            expect(mockListPropertiesByCustomer).toHaveBeenCalledWith('cust-123', { limit: undefined, cursor: undefined });
        });

        it('should return 200 with pagination params passed to service', async () => {
            const mockList = { items: [{ propertyId: 'prop-456' }], cursor: 'next-cursor' };
            mockListPropertiesByCustomer.mockResolvedValue(mockList);

            const event = makeListEvent({ limit: '5', cursor: 'some-cursor' }, { customerId: 'cust-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            expect(mockListPropertiesByCustomer).toHaveBeenCalledWith('cust-123', { limit: 5, cursor: 'some-cursor' });
        });

        it('should return 400 when customerId is missing', async () => {
            const event = makeListEvent(null, { customerId: 'cust-123' });
            (event as any).pathParameters = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });

    describe('update handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/properties/update')).handler;
        });

        it('should return 200 when property is updated with valid data', async () => {
            const mockUpdated = { propertyId: 'prop-123', name: 'Updated Residence' };
            mockUpdateProperty.mockResolvedValue(mockUpdated);

            const event = makeUpdateEvent({ propertyId: 'prop-123' }, { name: 'Updated Residence' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.propertyId).toBe('prop-123');
        });

        it('should return 400 when propertyId is missing', async () => {
            const event = makeUpdateEvent({ propertyId: 'prop-123' }, { name: 'Updated Residence' });
            (event as any).pathParameters = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when body is missing', async () => {
            const event = makeUpdateEvent({ propertyId: 'prop-123' }, {});
            (event as any).body = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });

    describe('delete handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/properties/delete')).handler;
        });

        it('should return 200 when property is deleted', async () => {
            mockDeleteProperty.mockResolvedValue(undefined);

            const event = makeDeleteEvent({ propertyId: 'prop-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.message).toBe('Property deleted');
        });

        it('should return 400 when propertyId is missing', async () => {
            const event = makeDeleteEvent({ propertyId: 'prop-123' });
            (event as any).pathParameters = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });
});
