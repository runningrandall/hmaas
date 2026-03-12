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

const mockCreateEntityCategory = vi.fn();
const mockListByEntity = vi.fn();
const mockDeleteEntityCategory = vi.fn();

vi.mock('../../../src/adapters/dynamo-entity-category-repository', () => ({
    DynamoEntityCategoryRepository: vi.fn().mockImplementation(function () { return {}; }),
}));

vi.mock('../../../src/adapters/event-bridge-publisher', () => ({
    EventBridgePublisher: vi.fn().mockImplementation(function () { return {}; }),
}));

vi.mock('../../../src/application/entity-category-service', () => ({
    EntityCategoryService: vi.fn().mockImplementation(function () {
        return {
            createEntityCategory: mockCreateEntityCategory,
            listByEntity: mockListByEntity,
            deleteEntityCategory: mockDeleteEntityCategory,
        };
    }),
}));

describe('PropertyCategory List Handler', () => {
    let handler: any;

    beforeEach(async () => {
        vi.clearAllMocks();
        handler = (await import('../../../src/handlers/propertyCategories/list')).handler;
    });

    it('should return 200 with categories for property', async () => {
        const mockList = {
            items: [{ entityType: 'property', entityId: 'prop-123', categoryId: 'cat-456' }],
            cursor: undefined,
        };
        mockListByEntity.mockResolvedValue(mockList);

        const event = makeListEvent(null, { propertyId: 'prop-123' });
        const result = await handler(event, mockContext);

        expect(result.statusCode).toBe(200);
        const body = JSON.parse(result.body);
        expect(body.items).toHaveLength(1);
        expect(body.items[0].categoryId).toBe('cat-456');
    });

    it('should call service with correct arguments', async () => {
        const mockList = { items: [], cursor: undefined };
        mockListByEntity.mockResolvedValue(mockList);

        const event = makeListEvent(null, { propertyId: 'prop-123' });
        await handler(event, mockContext);

        expect(mockListByEntity).toHaveBeenCalledWith(
            expect.any(String),
            'property',
            'prop-123',
            { limit: undefined, cursor: undefined },
        );
    });

    it('should pass pagination parameters to service', async () => {
        const mockList = { items: [], cursor: 'next-page' };
        mockListByEntity.mockResolvedValue(mockList);

        const event = makeListEvent({ limit: '10', cursor: 'abc123' }, { propertyId: 'prop-123' });
        const result = await handler(event, mockContext);

        expect(mockListByEntity).toHaveBeenCalledWith(
            expect.any(String),
            'property',
            'prop-123',
            { limit: 10, cursor: 'abc123' },
        );
        expect(result.statusCode).toBe(200);
        const body = JSON.parse(result.body);
        expect(body.cursor).toBe('next-page');
    });

    it('should return 400 when propertyId is missing', async () => {
        const event = makeListEvent();
        const result = await handler(event, mockContext);

        expect(result.statusCode).toBe(400);
    });

    it('should return 200 with empty list', async () => {
        const mockList = { items: [], cursor: undefined };
        mockListByEntity.mockResolvedValue(mockList);

        const event = makeListEvent(null, { propertyId: 'prop-123' });
        const result = await handler(event, mockContext);

        expect(result.statusCode).toBe(200);
        const body = JSON.parse(result.body);
        expect(body.items).toHaveLength(0);
    });

    it('should return 500 when service throws unexpected error', async () => {
        mockListByEntity.mockRejectedValue(new Error('DynamoDB failure'));

        const event = makeListEvent(null, { propertyId: 'prop-123' });
        const result = await handler(event, mockContext);

        expect(result.statusCode).toBe(500);
    });
});
