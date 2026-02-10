import { vi, describe, it, expect, beforeEach } from 'vitest';
import { handler } from '../../src/handlers/deleteItem';
import { ItemService } from '../../src/application/item-service';

// Mock dependencies
vi.mock('../../src/adapters/dynamo-item-repository');
vi.mock('../../src/adapters/event-bridge-publisher');
vi.mock('../../src/application/item-service', () => ({
    ItemService: vi.fn().mockReturnValue({
        deleteItem: vi.fn(),
    }),
}));

const makeEvent = (overrides: Record<string, any> = {}) => ({
    headers: { 'Content-Type': 'application/json' },
    body: null,
    pathParameters: null,
    queryStringParameters: null,
    multiValueHeaders: {},
    multiValueQueryStringParameters: null,
    httpMethod: 'DELETE',
    isBase64Encoded: false,
    path: '/items',
    stageVariables: null,
    requestContext: {} as any,
    resource: '',
    ...overrides,
});

describe('deleteItem handler', () => {
    let mockDeleteItem: any;

    beforeEach(() => {
        vi.clearAllMocks();
        // Get the mock instance
        const mockServiceInstance = new ItemService({} as any, {} as any);
        mockDeleteItem = mockServiceInstance.deleteItem;
    });

    it('should delete an item successfully', async () => {
        mockDeleteItem.mockResolvedValue();

        const event = makeEvent({
            pathParameters: { itemId: '123' },
        });

        const result = await handler(event, {} as any, {} as any);

        expect(result).toMatchObject({
            statusCode: 200,
            body: JSON.stringify({ message: 'Item deleted' }),
        });
        expect(mockDeleteItem).toHaveBeenCalledWith('123');
    });

    it('should return 400 if itemId is missing', async () => {
        const event = makeEvent({
            pathParameters: {},
        });

        const result = await handler(event, {} as any, {} as any);

        expect(result.statusCode).toBe(400);
        expect(mockDeleteItem).not.toHaveBeenCalled();
    });

    it('should return 400 if pathParameters is null', async () => {
        const event = makeEvent({
            pathParameters: null,
        });

        const result = await handler(event, {} as any, {} as any);

        expect(result.statusCode).toBe(400);
        expect(mockDeleteItem).not.toHaveBeenCalled();
    });

    it('should return 500 on error', async () => {
        mockDeleteItem.mockRejectedValue(new Error('Service Failed'));

        const event = makeEvent({
            pathParameters: { itemId: '123' },
        });

        const result = await handler(event, {} as any, {} as any);

        expect(result.statusCode).toBe(500);
    });
});

