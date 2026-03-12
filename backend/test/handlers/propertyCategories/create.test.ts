import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeCreateEvent, mockContext } from '../../helpers/test-utils';

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

describe('PropertyCategory Create Handler', () => {
    let handler: any;

    beforeEach(async () => {
        vi.clearAllMocks();
        handler = (await import('../../../src/handlers/propertyCategories/create')).handler;
    });

    it('should return 201 when category is assigned to property', async () => {
        const mockEc = { entityType: 'property', entityId: 'prop-123', categoryId: 'cat-456' };
        mockCreateEntityCategory.mockResolvedValue(mockEc);

        const event = makeCreateEvent({ categoryId: 'cat-456' }, { propertyId: 'prop-123' });
        const result = await handler(event, mockContext);

        expect(result.statusCode).toBe(201);
        const body = JSON.parse(result.body);
        expect(body.categoryId).toBe('cat-456');
        expect(body.entityType).toBe('property');
        expect(body.entityId).toBe('prop-123');
    });

    it('should call service with correct arguments', async () => {
        const mockEc = { entityType: 'property', entityId: 'prop-123', categoryId: 'cat-456' };
        mockCreateEntityCategory.mockResolvedValue(mockEc);

        const event = makeCreateEvent({ categoryId: 'cat-456' }, { propertyId: 'prop-123' });
        await handler(event, mockContext);

        expect(mockCreateEntityCategory).toHaveBeenCalledWith(
            expect.any(String),
            {
                entityType: 'property',
                entityId: 'prop-123',
                categoryId: 'cat-456',
            },
        );
    });

    it('should return 400 when propertyId is missing', async () => {
        const event = makeCreateEvent({ categoryId: 'cat-456' });
        const result = await handler(event, mockContext);

        expect(result.statusCode).toBe(400);
    });

    it('should return 400 when body is missing', async () => {
        const event = makeCreateEvent({}, { propertyId: 'prop-123' });
        (event as any).body = null;
        const result = await handler(event, mockContext);

        expect(result.statusCode).toBe(400);
    });

    it('should return 400 when categoryId is missing in body', async () => {
        const event = makeCreateEvent({}, { propertyId: 'prop-123' });
        const result = await handler(event, mockContext);

        expect(result.statusCode).toBe(400);
    });

    it('should return 500 when service throws unexpected error', async () => {
        mockCreateEntityCategory.mockRejectedValue(new Error('DynamoDB failure'));

        const event = makeCreateEvent({ categoryId: 'cat-456' }, { propertyId: 'prop-123' });
        const result = await handler(event, mockContext);

        expect(result.statusCode).toBe(500);
    });
});
