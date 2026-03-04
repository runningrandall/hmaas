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

const mockListServiceTypes = vi.fn();

vi.mock('../../../src/adapters/dynamo-service-type-repository', () => ({
    DynamoServiceTypeRepository: vi.fn().mockImplementation(function () { return {}; }),
}));

vi.mock('../../../src/adapters/event-bridge-publisher', () => ({
    EventBridgePublisher: vi.fn().mockImplementation(function () { return {}; }),
}));

vi.mock('../../../src/application/service-type-service', () => ({
    ServiceTypeService: vi.fn().mockImplementation(function () {
        return {
            listServiceTypes: mockListServiceTypes,
        };
    }),
}));

describe('listPublic handler', () => {
    let handler: any;

    beforeEach(async () => {
        vi.clearAllMocks();
        handler = (await import('../../../src/handlers/serviceTypes/listPublic')).handler;
    });

    it('should return 200 with service types using GLOBAL org ID', async () => {
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
        expect(mockListServiceTypes).toHaveBeenCalledWith('GLOBAL', { limit: undefined, cursor: undefined });
    });

    it('should support pagination params', async () => {
        const mockList = {
            items: [{ serviceTypeId: 'st-456', name: 'Window Cleaning' }],
            cursor: 'next-cursor',
        };
        mockListServiceTypes.mockResolvedValue(mockList);

        const event = makeListEvent({ limit: '10', cursor: 'some-cursor' });
        const result = await handler(event, mockContext);

        expect(result.statusCode).toBe(200);
        expect(mockListServiceTypes).toHaveBeenCalledWith('GLOBAL', { limit: 10, cursor: 'some-cursor' });
    });

    it('should return 200 with empty list when no service types exist', async () => {
        const mockList = { items: [], cursor: undefined };
        mockListServiceTypes.mockResolvedValue(mockList);

        const event = makeListEvent();
        const result = await handler(event, mockContext);

        expect(result.statusCode).toBe(200);
        const body = JSON.parse(result.body);
        expect(body.items).toHaveLength(0);
    });
});
