import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeListEvent, mockContext } from '../../helpers/test-utils';

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

const mockListPlans = vi.fn();

vi.mock('../../../src/adapters/dynamo-plan-repository', () => ({
    DynamoPlanRepository: vi.fn().mockImplementation(function () { return {}; }),
}));

vi.mock('../../../src/adapters/event-bridge-publisher', () => ({
    EventBridgePublisher: vi.fn().mockImplementation(function () { return {}; }),
}));

vi.mock('../../../src/application/plan-service', () => ({
    PlanAppService: vi.fn().mockImplementation(function () {
        return {
            listPlans: mockListPlans,
        };
    }),
}));

describe('listPublic plans handler', () => {
    let handler: any;

    beforeEach(async () => {
        vi.clearAllMocks();
        handler = (await import('../../../src/handlers/plans/listPublic')).handler;
    });

    it('should return 200 with plans for the given organizationId', async () => {
        const mockList = {
            items: [{ planId: 'plan-123', name: 'Basic Plan', monthlyPrice: 2999 }],
            cursor: undefined,
        };
        mockListPlans.mockResolvedValue(mockList);

        const event = makeListEvent({ organizationId: 'org-abc' });
        const result = await handler(event, mockContext);

        expect(result.statusCode).toBe(200);
        const body = JSON.parse(result.body);
        expect(body.items).toHaveLength(1);
        expect(mockListPlans).toHaveBeenCalledWith('org-abc', { limit: undefined, cursor: undefined });
    });

    it('should return 400 when organizationId query param is missing', async () => {
        const event = makeListEvent();
        const result = await handler(event, mockContext);

        expect(result.statusCode).toBe(400);
        const body = JSON.parse(result.body);
        expect(body.error.message).toContain('organizationId');
    });

    it('should support pagination params', async () => {
        const mockList = {
            items: [{ planId: 'plan-456', name: 'Premium Plan' }],
            cursor: 'next-cursor',
        };
        mockListPlans.mockResolvedValue(mockList);

        const event = makeListEvent({ organizationId: 'org-abc', limit: '5', cursor: 'some-cursor' });
        const result = await handler(event, mockContext);

        expect(result.statusCode).toBe(200);
        expect(mockListPlans).toHaveBeenCalledWith('org-abc', { limit: 5, cursor: 'some-cursor' });
    });
});
