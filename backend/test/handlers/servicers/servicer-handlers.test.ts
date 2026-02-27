import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeCreateEvent, makeGetEvent, makeUpdateEvent, mockContext } from '../../helpers/test-utils';

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

const mockCreateServicer = vi.fn();
const mockGetServicer = vi.fn();
const mockUpdateServicer = vi.fn();

vi.mock('../../../src/adapters/dynamo-servicer-repository', () => ({
    DynamoServicerRepository: vi.fn().mockImplementation(function () { return {}; }),
}));

vi.mock('../../../src/adapters/event-bridge-publisher', () => ({
    EventBridgePublisher: vi.fn().mockImplementation(function () { return {}; }),
}));

vi.mock('../../../src/application/servicer-service', () => ({
    ServicerService: vi.fn().mockImplementation(function () {
        return {
            createServicer: mockCreateServicer,
            getServicer: mockGetServicer,
            updateServicer: mockUpdateServicer,
        };
    }),
}));

describe('Servicer Handlers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('create handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/servicers/create')).handler;
        });

        it('should return 201 when servicer is created with valid body and employeeId', async () => {
            const mockServicer = {
                servicerId: 'servicer-123',
                employeeId: 'emp-123',
                serviceArea: 'North Denver Metro',
                maxDailyJobs: 8,
            };
            mockCreateServicer.mockResolvedValue(mockServicer);

            const event = makeCreateEvent(
                { serviceArea: 'North Denver Metro', maxDailyJobs: 8 },
                { employeeId: 'emp-123' },
            );
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(201);
            const body = JSON.parse(result.body);
            expect(body.servicerId).toBe('servicer-123');
            expect(body.employeeId).toBe('emp-123');
        });

        it('should return 400 when employeeId path param is missing', async () => {
            const event = makeCreateEvent({ serviceArea: 'North Denver Metro' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when body is missing but employeeId is provided', async () => {
            const event = makeCreateEvent({}, { employeeId: 'emp-123' });
            (event as any).body = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });

    describe('get handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/servicers/get')).handler;
        });

        it('should return 200 with servicer when valid servicerId provided', async () => {
            const mockServicer = { servicerId: 'servicer-123', employeeId: 'emp-123' };
            mockGetServicer.mockResolvedValue(mockServicer);

            const event = makeGetEvent({ servicerId: 'servicer-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.servicerId).toBe('servicer-123');
        });

        it('should return 400 when servicerId is missing', async () => {
            const event = makeGetEvent({ servicerId: 'servicer-123' });
            (event as any).pathParameters = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });

    describe('update handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/servicers/update')).handler;
        });

        it('should return 200 when servicer is updated with valid data', async () => {
            const mockUpdated = { servicerId: 'servicer-123', serviceArea: 'South Denver Metro' };
            mockUpdateServicer.mockResolvedValue(mockUpdated);

            const event = makeUpdateEvent({ servicerId: 'servicer-123' }, { serviceArea: 'South Denver Metro' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.servicerId).toBe('servicer-123');
        });

        it('should return 400 when servicerId is missing', async () => {
            const event = makeUpdateEvent({ servicerId: 'servicer-123' }, { serviceArea: 'South Denver Metro' });
            (event as any).pathParameters = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when body is missing', async () => {
            const event = makeUpdateEvent({ servicerId: 'servicer-123' }, {});
            (event as any).body = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });
});
