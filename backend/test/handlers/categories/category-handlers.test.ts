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

const mockCreateCategory = vi.fn();
const mockGetCategory = vi.fn();
const mockListCategories = vi.fn();
const mockUpdateCategory = vi.fn();
const mockDeleteCategory = vi.fn();

vi.mock('../../../src/adapters/dynamo-category-repository', () => ({
    DynamoCategoryRepository: vi.fn().mockImplementation(function () { return {}; }),
}));

vi.mock('../../../src/adapters/event-bridge-publisher', () => ({
    EventBridgePublisher: vi.fn().mockImplementation(function () { return {}; }),
}));

vi.mock('../../../src/application/category-service', () => ({
    CategoryService: vi.fn().mockImplementation(function () {
        return {
            createCategory: mockCreateCategory,
            getCategory: mockGetCategory,
            listCategories: mockListCategories,
            updateCategory: mockUpdateCategory,
            deleteCategory: mockDeleteCategory,
        };
    }),
}));

describe('Category Handlers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('create handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/categories/create')).handler;
        });

        it('should return 201 when category is created with valid body', async () => {
            const mockCategory = { categoryId: 'cat-123', name: 'Outdoor', description: 'Outdoor services' };
            mockCreateCategory.mockResolvedValue(mockCategory);

            const event = makeCreateEvent({ name: 'Outdoor', description: 'Outdoor services' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(201);
            const body = JSON.parse(result.body);
            expect(body.categoryId).toBe('cat-123');
        });

        it('should return 201 with only required name field', async () => {
            const mockCategory = { categoryId: 'cat-456', name: 'Indoor' };
            mockCreateCategory.mockResolvedValue(mockCategory);

            const event = makeCreateEvent({ name: 'Indoor' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(201);
        });

        it('should return 400 when body is missing', async () => {
            const event = makeCreateEvent({});
            (event as any).body = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when required name field is missing', async () => {
            const event = makeCreateEvent({ description: 'Some description' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });

    describe('get handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/categories/get')).handler;
        });

        it('should return 200 with category when valid categoryId provided', async () => {
            const mockCategory = { categoryId: 'cat-123', name: 'Outdoor' };
            mockGetCategory.mockResolvedValue(mockCategory);

            const event = makeGetEvent({ categoryId: 'cat-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.categoryId).toBe('cat-123');
        });

        it('should return 400 when categoryId is missing', async () => {
            const event = makeGetEvent({ categoryId: 'cat-123' });
            (event as any).pathParameters = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });

    describe('list handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/categories/list')).handler;
        });

        it('should return 200 with categories', async () => {
            const mockList = { items: [{ categoryId: 'cat-123', name: 'Outdoor' }], cursor: undefined };
            mockListCategories.mockResolvedValue(mockList);

            const event = makeListEvent();
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.items).toHaveLength(1);
        });

        it('should support pagination params', async () => {
            const mockList = { items: [], cursor: 'next-cursor' };
            mockListCategories.mockResolvedValue(mockList);

            const event = makeListEvent({ limit: '10', cursor: 'some-cursor' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            expect(mockListCategories).toHaveBeenCalledWith('org-test-123', { limit: 10, cursor: 'some-cursor' });
        });
    });

    describe('update handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/categories/update')).handler;
        });

        it('should return 200 when category is updated', async () => {
            const mockUpdated = { categoryId: 'cat-123', name: 'Premium Outdoor' };
            mockUpdateCategory.mockResolvedValue(mockUpdated);

            const event = makeUpdateEvent({ categoryId: 'cat-123' }, { name: 'Premium Outdoor' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
        });

        it('should return 400 when categoryId is missing', async () => {
            const event = makeUpdateEvent({ categoryId: 'cat-123' }, { name: 'Test' });
            (event as any).pathParameters = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when body is missing', async () => {
            const event = makeUpdateEvent({ categoryId: 'cat-123' }, {});
            (event as any).body = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });

    describe('delete handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/categories/delete')).handler;
        });

        it('should return 204 when category is deleted', async () => {
            mockDeleteCategory.mockResolvedValue(undefined);

            const event = makeDeleteEvent({ categoryId: 'cat-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(204);
        });

        it('should return 400 when categoryId is missing', async () => {
            const event = makeDeleteEvent({ categoryId: 'cat-123' });
            (event as any).pathParameters = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });
});
