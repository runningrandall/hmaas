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

const mockListPropertyTypes = vi.fn();

vi.mock('../../../src/adapters/dynamo-property-type-repository', () => ({
    DynamoPropertyTypeRepository: vi.fn().mockImplementation(function () { return {}; }),
}));

vi.mock('../../../src/adapters/event-bridge-publisher', () => ({
    EventBridgePublisher: vi.fn().mockImplementation(function () { return {}; }),
}));

vi.mock('../../../src/application/property-type-service', () => ({
    PropertyTypeService: vi.fn().mockImplementation(function () {
        return {
            listPropertyTypes: mockListPropertyTypes,
        };
    }),
}));

describe('listPublic property types handler', () => {
    let handler: any;

    beforeEach(async () => {
        vi.clearAllMocks();
        handler = (await import('../../../src/handlers/propertyTypes/listPublic')).handler;
    });

    it('should return 200 with property types using GLOBAL org ID', async () => {
        const mockList = {
            items: [{ propertyTypeId: 'pt-123', name: 'Residential' }],
            cursor: undefined,
        };
        mockListPropertyTypes.mockResolvedValue(mockList);

        const event = makeListEvent();
        const result = await handler(event, mockContext);

        expect(result.statusCode).toBe(200);
        const body = JSON.parse(result.body);
        expect(body.items).toHaveLength(1);
        expect(mockListPropertyTypes).toHaveBeenCalledWith('GLOBAL', { limit: undefined, cursor: undefined });
    });

    it('should support pagination params', async () => {
        const mockList = {
            items: [{ propertyTypeId: 'pt-456', name: 'Commercial' }],
            cursor: 'next-cursor',
        };
        mockListPropertyTypes.mockResolvedValue(mockList);

        const event = makeListEvent({ limit: '10', cursor: 'some-cursor' });
        const result = await handler(event, mockContext);

        expect(result.statusCode).toBe(200);
        expect(mockListPropertyTypes).toHaveBeenCalledWith('GLOBAL', { limit: 10, cursor: 'some-cursor' });
    });

    it('should return 200 with empty list when no property types exist', async () => {
        const mockList = { items: [], cursor: undefined };
        mockListPropertyTypes.mockResolvedValue(mockList);

        const event = makeListEvent();
        const result = await handler(event, mockContext);

        expect(result.statusCode).toBe(200);
        const body = JSON.parse(result.body);
        expect(body.items).toHaveLength(0);
    });
});
