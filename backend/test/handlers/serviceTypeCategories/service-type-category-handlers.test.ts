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

describe('ServiceTypeCategory Handlers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('create handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/serviceTypeCategories/create')).handler;
        });

        it('should return 201 when category is assigned to service type', async () => {
            const mockEc = { entityType: 'serviceType', entityId: 'st-123', categoryId: 'cat-456' };
            mockCreateEntityCategory.mockResolvedValue(mockEc);

            const event = makeCreateEvent({ categoryId: 'cat-456' }, { serviceTypeId: 'st-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(201);
            const body = JSON.parse(result.body);
            expect(body.categoryId).toBe('cat-456');
        });

        it('should return 400 when serviceTypeId is missing', async () => {
            const event = makeCreateEvent({ categoryId: 'cat-456' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when body is missing', async () => {
            const event = makeCreateEvent({}, { serviceTypeId: 'st-123' });
            (event as any).body = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when categoryId is missing in body', async () => {
            const event = makeCreateEvent({}, { serviceTypeId: 'st-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });

    describe('list handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/serviceTypeCategories/list')).handler;
        });

        it('should return 200 with categories for service type', async () => {
            const mockList = {
                items: [{ entityType: 'serviceType', entityId: 'st-123', categoryId: 'cat-456' }],
                cursor: undefined,
            };
            mockListByEntity.mockResolvedValue(mockList);

            const event = makeListEvent(null, { serviceTypeId: 'st-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.items).toHaveLength(1);
        });

        it('should return 400 when serviceTypeId is missing', async () => {
            const event = makeListEvent();
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });

    describe('delete handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/serviceTypeCategories/delete')).handler;
        });

        it('should return 204 when category is removed from service type', async () => {
            mockDeleteEntityCategory.mockResolvedValue(undefined);

            const event = makeDeleteEvent({ serviceTypeId: 'st-123', categoryId: 'cat-456' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(204);
        });

        it('should return 400 when serviceTypeId is missing', async () => {
            const event = makeDeleteEvent({ categoryId: 'cat-456' });
            (event as any).pathParameters = { categoryId: 'cat-456' };
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when categoryId is missing', async () => {
            const event = makeDeleteEvent({ serviceTypeId: 'st-123' });
            (event as any).pathParameters = { serviceTypeId: 'st-123' };
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });
});
