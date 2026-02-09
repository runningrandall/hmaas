import { vi, describe, it, expect, beforeEach } from 'vitest';
import { handler } from '../../src/handlers/getItem';
import { ItemEntity } from '../../src/entities/item';

// Mock electrodb Entity
vi.mock('../../src/entities/item', () => ({
    ItemEntity: {
        get: vi.fn(),
    },
}));

describe('getItem handler', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should get an item successfully', async () => {
        const mockItem = { itemId: '123', name: 'Test Item', description: 'desc' };

        // Mock chainable .tel() and .go()
        // ElectroDB .get() returns a query object, .go() executes it.
        const mockGo = vi.fn().mockResolvedValue({ data: mockItem });
        (ItemEntity.get as any).mockReturnValue({ go: mockGo });

        const event = {
            pathParameters: { itemId: '123' },
        } as any;

        const result = await handler(event, {} as any, {} as any);

        expect(result).toMatchObject({
            statusCode: 200,
            body: JSON.stringify(mockItem),
        });
        expect(ItemEntity.get).toHaveBeenCalledWith({ itemId: '123' });
    });

    it('should return 400 if itemId is missing', async () => {
        const event = {
            pathParameters: {},
        } as any;

        const result = await handler(event, {} as any, {} as any);

        expect(result).toMatchObject({
            statusCode: 400,
            body: JSON.stringify({ error: 'Missing itemId' }),
        });
    });

    it('should return 404 if item not found', async () => {
        const mockGo = vi.fn().mockResolvedValue({ data: null });
        (ItemEntity.get as any).mockReturnValue({ go: mockGo });

        const event = {
            pathParameters: { itemId: '404' },
        } as any;

        const result = await handler(event, {} as any, {} as any);

        expect(result).toMatchObject({
            statusCode: 404,
            body: JSON.stringify({ error: 'Item not found' }),
        });
    });

    it('should return 500 on error', async () => {
        const errorMsg = 'DB Error';
        const mockGo = vi.fn().mockRejectedValue(new Error(errorMsg));
        (ItemEntity.get as any).mockReturnValue({ go: mockGo });

        const event = {
            pathParameters: { itemId: '123' },
        } as any;

        const result = await handler(event, {} as any, {} as any);

        expect(result).toMatchObject({
            statusCode: 500,
            body: JSON.stringify({ error: errorMsg }),
        });
    });
});
