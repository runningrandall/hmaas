import { vi, describe, it, expect, beforeEach } from 'vitest';
import { handler } from '../../src/handlers/getItem';
import { ItemService } from '../../src/application/item-service';
import { AppError } from '../../src/lib/error';

// Mock dependencies
vi.mock('../../src/adapters/dynamo-item-repository');
vi.mock('../../src/adapters/event-bridge-publisher');
vi.mock('../../src/application/item-service', () => ({
    ItemService: vi.fn().mockReturnValue({
        getItem: vi.fn(),
    }),
}));

const makeEvent = (overrides: Record<string, any> = {}) => ({
    headers: { 'Content-Type': 'application/json' },
    body: null,
    pathParameters: null,
    queryStringParameters: null,
    multiValueHeaders: {},
    multiValueQueryStringParameters: null,
    httpMethod: 'GET',
    isBase64Encoded: false,
    path: '/items',
    stageVariables: null,
    requestContext: {} as any,
    resource: '',
    ...overrides,
});

describe('getItem handler', () => {
    let mockGetItem: any;

    beforeEach(() => {
        vi.clearAllMocks();
        // Get the mock instance
        const mockServiceInstance = new ItemService({} as any, {} as any);
        mockGetItem = mockServiceInstance.getItem;
    });

    it('should get an item successfully', async () => {
        const mockItem = { itemId: '123', name: 'Test Item', description: 'desc', createdAt: '2023-01-01' };
        mockGetItem.mockResolvedValue(mockItem);

        const event = makeEvent({
            pathParameters: { itemId: '123' },
        });

        const result = await handler(event, {} as any, {} as any);

        expect(result).toMatchObject({
            statusCode: 200,
            body: JSON.stringify(mockItem),
        });
        expect(mockGetItem).toHaveBeenCalledWith('123');
    });

    it('should return 400 if itemId is missing', async () => {
        const event = makeEvent({
            pathParameters: {},
        });

        const result = await handler(event, {} as any, {} as any);

        expect(result.statusCode).toBe(400);
        expect(mockGetItem).not.toHaveBeenCalled();
    });

    it('should return 404 if item not found', async () => {
        mockGetItem.mockRejectedValue(new AppError('Item not found', 404));

        const event = makeEvent({
            pathParameters: { itemId: '404' },
        });

        const result = await handler(event, {} as any, {} as any);

        expect(result.statusCode).toBe(404);
    });

    it('should return 500 on error', async () => {
        mockGetItem.mockRejectedValue(new Error('Service Failed'));

        const event = makeEvent({
            pathParameters: { itemId: '123' },
        });

        const result = await handler(event, {} as any, {} as any);

        expect(result.statusCode).toBe(500);
    });
});

