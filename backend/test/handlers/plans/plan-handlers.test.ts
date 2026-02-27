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

const mockCreatePlan = vi.fn();
const mockGetPlan = vi.fn();
const mockListPlans = vi.fn();
const mockUpdatePlan = vi.fn();
const mockDeletePlan = vi.fn();

vi.mock('../../../src/adapters/dynamo-plan-repository', () => ({
    DynamoPlanRepository: vi.fn().mockImplementation(function () { return {}; }),
}));

vi.mock('../../../src/adapters/event-bridge-publisher', () => ({
    EventBridgePublisher: vi.fn().mockImplementation(function () { return {}; }),
}));

vi.mock('../../../src/application/plan-service', () => ({
    PlanAppService: vi.fn().mockImplementation(function () {
        return {
            createPlan: mockCreatePlan,
            getPlan: mockGetPlan,
            listPlans: mockListPlans,
            updatePlan: mockUpdatePlan,
            deletePlan: mockDeletePlan,
        };
    }),
}));

describe('Plan Handlers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('create handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/plans/create')).handler;
        });

        it('should return 201 when plan is created with valid body', async () => {
            const mockPlan = {
                planId: 'plan-123',
                name: 'Premium Bundle',
                monthlyPrice: 14999,
            };
            mockCreatePlan.mockResolvedValue(mockPlan);

            const event = makeCreateEvent({ name: 'Premium Bundle', monthlyPrice: 14999 });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(201);
            const body = JSON.parse(result.body);
            expect(body.planId).toBe('plan-123');
            expect(body.name).toBe('Premium Bundle');
        });

        it('should return 400 when body is missing', async () => {
            const event = makeCreateEvent({});
            (event as any).body = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when required fields are missing', async () => {
            const event = makeCreateEvent({ name: 'Premium Bundle' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when monthlyPrice is not an integer', async () => {
            const event = makeCreateEvent({ name: 'Premium Bundle', monthlyPrice: 149.99 });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });

    describe('get handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/plans/get')).handler;
        });

        it('should return 200 with plan when valid planId provided', async () => {
            const mockPlan = { planId: 'plan-123', name: 'Premium Bundle', monthlyPrice: 14999 };
            mockGetPlan.mockResolvedValue(mockPlan);

            const event = makeGetEvent({ planId: 'plan-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.planId).toBe('plan-123');
            expect(body.name).toBe('Premium Bundle');
        });

        it('should return 400 when planId is missing', async () => {
            const event = makeGetEvent({ planId: 'plan-123' });
            (event as any).pathParameters = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });

    describe('list handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/plans/list')).handler;
        });

        it('should return 200 with plans when no params provided', async () => {
            const mockList = { items: [{ planId: 'plan-123', name: 'Premium Bundle' }], cursor: undefined };
            mockListPlans.mockResolvedValue(mockList);

            const event = makeListEvent();
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.items).toHaveLength(1);
        });

        it('should return 200 with plans when limit and cursor params provided', async () => {
            const mockList = { items: [{ planId: 'plan-456', name: 'Basic Bundle' }], cursor: 'next-cursor' };
            mockListPlans.mockResolvedValue(mockList);

            const event = makeListEvent({ limit: '10', cursor: 'some-cursor' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.items).toHaveLength(1);
            expect(mockListPlans).toHaveBeenCalledWith({ limit: 10, cursor: 'some-cursor' });
        });
    });

    describe('update handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/plans/update')).handler;
        });

        it('should return 200 when plan is updated with valid data', async () => {
            const mockUpdated = { planId: 'plan-123', name: 'Updated Bundle', monthlyPrice: 14999 };
            mockUpdatePlan.mockResolvedValue(mockUpdated);

            const event = makeUpdateEvent({ planId: 'plan-123' }, { name: 'Updated Bundle' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.planId).toBe('plan-123');
            expect(body.name).toBe('Updated Bundle');
        });

        it('should return 400 when planId is missing', async () => {
            const event = makeUpdateEvent({ planId: 'plan-123' }, { name: 'Updated Bundle' });
            (event as any).pathParameters = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when body is missing', async () => {
            const event = makeUpdateEvent({ planId: 'plan-123' }, {});
            (event as any).body = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });

    describe('delete handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/plans/delete')).handler;
        });

        it('should return 204 when plan is deleted', async () => {
            mockDeletePlan.mockResolvedValue(undefined);

            const event = makeDeleteEvent({ planId: 'plan-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(204);
            expect(result.body).toBe('');
        });

        it('should return 400 when planId is missing', async () => {
            const event = makeDeleteEvent({ planId: 'plan-123' });
            (event as any).pathParameters = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });
});
