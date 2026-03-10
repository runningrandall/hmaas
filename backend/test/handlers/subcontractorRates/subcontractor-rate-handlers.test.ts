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

const mockCreateRate = vi.fn();
const mockGetRate = vi.fn();
const mockListRatesBySubcontractor = vi.fn();
const mockUpdateRate = vi.fn();
const mockDeleteRate = vi.fn();

vi.mock('../../../src/adapters/dynamo-subcontractor-rate-repository', () => ({
    DynamoSubcontractorRateRepository: vi.fn().mockImplementation(function () { return {}; }),
}));

vi.mock('../../../src/adapters/event-bridge-publisher', () => ({
    EventBridgePublisher: vi.fn().mockImplementation(function () { return {}; }),
}));

vi.mock('../../../src/application/subcontractor-rate-service', () => ({
    SubcontractorRateService: vi.fn().mockImplementation(function () {
        return {
            createRate: mockCreateRate,
            getRate: mockGetRate,
            listRatesBySubcontractor: mockListRatesBySubcontractor,
            updateRate: mockUpdateRate,
            deleteRate: mockDeleteRate,
        };
    }),
}));

describe('Subcontractor Rate Handlers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('create handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/subcontractorRates/create')).handler;
        });

        it('should return 201 when rate is created with valid body and subcontractorId', async () => {
            const mockRate = {
                subcontractorRateId: 'rate-123',
                subcontractorId: 'sub-123',
                propertyId: 'prop-1',
                serviceTypeId: 'svc-type-1',
                rate: 7500,
                unit: 'per_visit',
            };
            mockCreateRate.mockResolvedValue(mockRate);

            const event = makeCreateEvent(
                { propertyId: 'prop-1', serviceTypeId: 'svc-type-1', rate: 7500, unit: 'per_visit' },
                { subcontractorId: 'sub-123' },
            );
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(201);
            const body = JSON.parse(result.body);
            expect(body.subcontractorRateId).toBe('rate-123');
            expect(body.rate).toBe(7500);
        });

        it('should return 400 when subcontractorId path param is missing', async () => {
            const event = makeCreateEvent({ propertyId: 'prop-1', serviceTypeId: 'svc-1', rate: 7500, unit: 'per_visit' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when body is missing', async () => {
            const event = makeCreateEvent({}, { subcontractorId: 'sub-123' });
            (event as any).body = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when required fields are missing', async () => {
            const event = makeCreateEvent({ propertyId: 'prop-1' }, { subcontractorId: 'sub-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when rate is negative', async () => {
            const event = makeCreateEvent(
                { propertyId: 'prop-1', serviceTypeId: 'svc-1', rate: -100, unit: 'per_visit' },
                { subcontractorId: 'sub-123' },
            );
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });

    describe('list handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/subcontractorRates/list')).handler;
        });

        it('should return 200 with rates list', async () => {
            const mockList = { items: [{ subcontractorRateId: 'rate-123' }], cursor: null };
            mockListRatesBySubcontractor.mockResolvedValue(mockList);

            const event = makeListEvent(null, { subcontractorId: 'sub-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.items).toHaveLength(1);
        });

        it('should return 400 when subcontractorId is missing', async () => {
            const event = makeListEvent();
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });

    describe('get handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/subcontractorRates/get')).handler;
        });

        it('should return 200 with rate', async () => {
            const mockRate = { subcontractorRateId: 'rate-123', rate: 7500 };
            mockGetRate.mockResolvedValue(mockRate);

            const event = makeGetEvent({ subcontractorRateId: 'rate-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.subcontractorRateId).toBe('rate-123');
        });

        it('should return 400 when subcontractorRateId is missing', async () => {
            const event = makeGetEvent({ subcontractorRateId: 'rate-123' });
            (event as any).pathParameters = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });

    describe('update handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/subcontractorRates/update')).handler;
        });

        it('should return 200 when updated with valid data', async () => {
            const mockUpdated = { subcontractorRateId: 'rate-123', rate: 8000 };
            mockUpdateRate.mockResolvedValue(mockUpdated);

            const event = makeUpdateEvent({ subcontractorRateId: 'rate-123' }, { rate: 8000 });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.rate).toBe(8000);
        });

        it('should return 400 when subcontractorRateId is missing', async () => {
            const event = makeUpdateEvent({ subcontractorRateId: 'rate-123' }, { rate: 8000 });
            (event as any).pathParameters = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when body is missing', async () => {
            const event = makeUpdateEvent({ subcontractorRateId: 'rate-123' }, {});
            (event as any).body = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });

    describe('delete handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/subcontractorRates/delete')).handler;
        });

        it('should return 200 when rate is deleted', async () => {
            mockDeleteRate.mockResolvedValue(undefined);

            const event = makeDeleteEvent({ subcontractorRateId: 'rate-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.message).toBe('Subcontractor rate deleted');
        });

        it('should return 400 when subcontractorRateId is missing', async () => {
            const event = makeDeleteEvent({ subcontractorRateId: 'rate-123' });
            (event as any).pathParameters = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });
});
