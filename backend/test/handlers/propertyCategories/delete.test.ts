import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeDeleteEvent, mockContext } from '../../helpers/test-utils';

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

describe('PropertyCategory Delete Handler', () => {
    let handler: any;

    beforeEach(async () => {
        vi.clearAllMocks();
        handler = (await import('../../../src/handlers/propertyCategories/delete')).handler;
    });

    it('should return 204 when category is removed from property', async () => {
        mockDeleteEntityCategory.mockResolvedValue(undefined);

        const event = makeDeleteEvent({ propertyId: 'prop-123', categoryId: 'cat-456' });
        const result = await handler(event, mockContext);

        expect(result.statusCode).toBe(204);
        expect(result.body).toBe('');
    });

    it('should call service with correct arguments', async () => {
        mockDeleteEntityCategory.mockResolvedValue(undefined);

        const event = makeDeleteEvent({ propertyId: 'prop-123', categoryId: 'cat-456' });
        await handler(event, mockContext);

        expect(mockDeleteEntityCategory).toHaveBeenCalledWith(
            expect.any(String),
            'property',
            'prop-123',
            'cat-456',
        );
    });

    it('should return 400 when propertyId is missing', async () => {
        const event = makeDeleteEvent({ categoryId: 'cat-456' });
        (event as any).pathParameters = { categoryId: 'cat-456' };
        const result = await handler(event, mockContext);

        expect(result.statusCode).toBe(400);
    });

    it('should return 400 when categoryId is missing', async () => {
        const event = makeDeleteEvent({ propertyId: 'prop-123' });
        (event as any).pathParameters = { propertyId: 'prop-123' };
        const result = await handler(event, mockContext);

        expect(result.statusCode).toBe(400);
    });

    it('should return 500 when service throws unexpected error', async () => {
        mockDeleteEntityCategory.mockRejectedValue(new Error('DynamoDB failure'));

        const event = makeDeleteEvent({ propertyId: 'prop-123', categoryId: 'cat-456' });
        const result = await handler(event, mockContext);

        expect(result.statusCode).toBe(500);
    });
});
