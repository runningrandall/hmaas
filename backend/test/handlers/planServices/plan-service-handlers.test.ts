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

const mockCreatePlanService = vi.fn();
const mockListPlanServices = vi.fn();
const mockDeletePlanService = vi.fn();

vi.mock('../../../src/adapters/dynamo-plan-service-repository', () => ({
    DynamoPlanServiceRepository: vi.fn().mockImplementation(function () { return {}; }),
}));

vi.mock('../../../src/adapters/event-bridge-publisher', () => ({
    EventBridgePublisher: vi.fn().mockImplementation(function () { return {}; }),
}));

vi.mock('../../../src/application/plan-service-mgmt-service', () => ({
    PlanServiceMgmtService: vi.fn().mockImplementation(function () {
        return {
            createPlanService: mockCreatePlanService,
            listPlanServices: mockListPlanServices,
            deletePlanService: mockDeletePlanService,
        };
    }),
}));

describe('Plan Service Handlers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('create handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/planServices/create')).handler;
        });

        it('should return 201 when plan service is created with valid body', async () => {
            const mockPlanService = {
                planId: 'plan-123',
                serviceTypeId: 'svc-type-456',
                includedVisits: 12,
            };
            mockCreatePlanService.mockResolvedValue(mockPlanService);

            const event = makeCreateEvent({ serviceTypeId: 'svc-type-456', includedVisits: 12 }, { planId: 'plan-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(201);
            const body = JSON.parse(result.body);
            expect(body.planId).toBe('plan-123');
            expect(body.serviceTypeId).toBe('svc-type-456');
        });

        it('should return 400 when planId path param is missing', async () => {
            const event = makeCreateEvent({ serviceTypeId: 'svc-type-456' });
            (event as any).pathParameters = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when body is missing', async () => {
            const event = makeCreateEvent({}, { planId: 'plan-123' });
            (event as any).body = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when serviceTypeId is missing from body', async () => {
            const event = makeCreateEvent({ includedVisits: 12 }, { planId: 'plan-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });

    describe('list handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/planServices/list')).handler;
        });

        it('should return 200 with plan services when valid planId provided', async () => {
            const mockList = {
                items: [{ planId: 'plan-123', serviceTypeId: 'svc-type-456' }],
                cursor: undefined,
            };
            mockListPlanServices.mockResolvedValue(mockList);

            const event = makeListEvent(null, { planId: 'plan-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.items).toHaveLength(1);
            expect(mockListPlanServices).toHaveBeenCalledWith('plan-123', { limit: undefined, cursor: undefined });
        });

        it('should return 400 when planId path param is missing', async () => {
            const event = makeListEvent(null, null);
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 200 with plan services when limit and cursor provided', async () => {
            const mockList = {
                items: [{ planId: 'plan-123', serviceTypeId: 'svc-type-789' }],
                cursor: 'next-cursor',
            };
            mockListPlanServices.mockResolvedValue(mockList);

            const event = makeListEvent({ limit: '5', cursor: 'some-cursor' }, { planId: 'plan-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            expect(mockListPlanServices).toHaveBeenCalledWith('plan-123', { limit: 5, cursor: 'some-cursor' });
        });
    });

    describe('delete handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/planServices/delete')).handler;
        });

        it('should return 204 when plan service is deleted', async () => {
            mockDeletePlanService.mockResolvedValue(undefined);

            const event = makeDeleteEvent({ planId: 'plan-123', serviceTypeId: 'svc-type-456' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(204);
            expect(result.body).toBe('');
        });

        it('should return 400 when planId is missing', async () => {
            const event = makeDeleteEvent({ serviceTypeId: 'svc-type-456' });
            (event as any).pathParameters = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when serviceTypeId is missing', async () => {
            const event = makeDeleteEvent({ planId: 'plan-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });
});
