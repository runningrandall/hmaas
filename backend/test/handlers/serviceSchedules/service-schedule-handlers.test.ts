import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeCreateEvent, makeGetEvent, makeListEvent, makeUpdateEvent, mockContext } from '../../helpers/test-utils';

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

const mockCreateServiceSchedule = vi.fn();
const mockGetServiceSchedule = vi.fn();
const mockListByServicerId = vi.fn();
const mockUpdateServiceSchedule = vi.fn();

vi.mock('../../../src/adapters/dynamo-service-schedule-repository', () => ({
    DynamoServiceScheduleRepository: vi.fn().mockImplementation(function () { return {}; }),
}));

vi.mock('../../../src/adapters/event-bridge-publisher', () => ({
    EventBridgePublisher: vi.fn().mockImplementation(function () { return {}; }),
}));

vi.mock('../../../src/application/service-schedule-service', () => ({
    ServiceScheduleService: vi.fn().mockImplementation(function () {
        return {
            createServiceSchedule: mockCreateServiceSchedule,
            getServiceSchedule: mockGetServiceSchedule,
            listByServicerId: mockListByServicerId,
            updateServiceSchedule: mockUpdateServiceSchedule,
        };
    }),
}));

describe('Service Schedule Handlers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('create handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/serviceSchedules/create')).handler;
        });

        it('should return 201 when service schedule is created with valid body', async () => {
            const mockSchedule = {
                serviceScheduleId: 'sched-123',
                serviceId: 'svc-001',
                servicerId: 'servicer-001',
                scheduledDate: '2024-06-15',
            };
            mockCreateServiceSchedule.mockResolvedValue(mockSchedule);

            const event = makeCreateEvent({
                serviceId: 'svc-001',
                servicerId: 'servicer-001',
                scheduledDate: '2024-06-15',
            });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(201);
            const body = JSON.parse(result.body);
            expect(body.serviceScheduleId).toBe('sched-123');
            expect(body.serviceId).toBe('svc-001');
        });

        it('should return 400 when body is missing', async () => {
            const event = makeCreateEvent({});
            (event as any).body = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when required body fields are missing', async () => {
            const event = makeCreateEvent({ serviceId: 'svc-001' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });

    describe('get handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/serviceSchedules/get')).handler;
        });

        it('should return 200 with service schedule when valid serviceScheduleId provided', async () => {
            const mockSchedule = {
                serviceScheduleId: 'sched-123',
                serviceId: 'svc-001',
                servicerId: 'servicer-001',
            };
            mockGetServiceSchedule.mockResolvedValue(mockSchedule);

            const event = makeGetEvent({ serviceScheduleId: 'sched-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.serviceScheduleId).toBe('sched-123');
        });

        it('should return 400 when serviceScheduleId is missing', async () => {
            const event = makeGetEvent({ serviceScheduleId: 'sched-123' });
            (event as any).pathParameters = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });

    describe('list handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/serviceSchedules/list')).handler;
        });

        it('should return 200 with schedules when valid servicerId provided', async () => {
            const mockList = { items: [{ serviceScheduleId: 'sched-123', servicerId: 'servicer-001' }], cursor: undefined };
            mockListByServicerId.mockResolvedValue(mockList);

            const event = makeListEvent(null, { servicerId: 'servicer-001' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.items).toHaveLength(1);
            expect(mockListByServicerId).toHaveBeenCalledWith('org-test-123', 'servicer-001', { limit: undefined, cursor: undefined });
        });

        it('should return 200 with pagination params passed to service', async () => {
            const mockList = { items: [{ serviceScheduleId: 'sched-456' }], cursor: 'next-cursor' };
            mockListByServicerId.mockResolvedValue(mockList);

            const event = makeListEvent({ limit: '10', cursor: 'some-cursor' }, { servicerId: 'servicer-001' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            expect(mockListByServicerId).toHaveBeenCalledWith('org-test-123', 'servicer-001', { limit: 10, cursor: 'some-cursor' });
        });

        it('should return 400 when servicerId is missing', async () => {
            const event = makeListEvent(null, { servicerId: 'servicer-001' });
            (event as any).pathParameters = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });

    describe('update handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/serviceSchedules/update')).handler;
        });

        it('should return 200 when service schedule is updated with valid data', async () => {
            const mockUpdated = { serviceScheduleId: 'sched-123', scheduledDate: '2024-06-16' };
            mockUpdateServiceSchedule.mockResolvedValue(mockUpdated);

            const event = makeUpdateEvent({ serviceScheduleId: 'sched-123' }, { scheduledDate: '2024-06-16' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.serviceScheduleId).toBe('sched-123');
        });

        it('should return 400 when serviceScheduleId is missing', async () => {
            const event = makeUpdateEvent({ serviceScheduleId: 'sched-123' }, { scheduledDate: '2024-06-16' });
            (event as any).pathParameters = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when body is missing', async () => {
            const event = makeUpdateEvent({ serviceScheduleId: 'sched-123' }, {});
            (event as any).body = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });
});
