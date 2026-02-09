import { vi, describe, it, expect, beforeEach } from 'vitest';
import { handler } from '../../src/handlers/createItem';
import { ItemEntity } from '../../src/entities/item';

// Mock electrodb Entity
vi.mock('../../src/entities/item', () => ({
    ItemEntity: {
        create: vi.fn(),
    },
}));

describe('createItem handler', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should create an item successfully', async () => {
        const mockItem = { itemId: '123', name: 'Test Item', description: 'desc' };

        // Mock chainable .go() method
        const mockGo = vi.fn().mockResolvedValue({ data: mockItem });
        (ItemEntity.create as any).mockReturnValue({ go: mockGo });

        const event = {
            body: JSON.stringify({ name: 'Test Item', description: 'desc' }),
        } as any;

        const result = await handler(event, {} as any, {} as any);

        expect(result).toMatchObject({
            statusCode: 201,
            body: JSON.stringify(mockItem),
        });
        expect(ItemEntity.create).toHaveBeenCalledWith({ name: 'Test Item', description: 'desc' });
    });

    it('should return 400 if body is missing', async () => {
        const event = {} as any;
        const result = await handler(event, {} as any, {} as any);

        expect(result).toMatchObject({
            statusCode: 400,
            body: JSON.stringify({ error: 'Missing body' }),
        });
    });

    it('should return 500 on error', async () => {
        const errorMsg = 'DB Error';
        const mockGo = vi.fn().mockRejectedValue(new Error(errorMsg));
        (ItemEntity.create as any).mockReturnValue({ go: mockGo });

        const event = {
            body: JSON.stringify({ name: 'Fail' }),
        } as any;

        const result = await handler(event, {} as any, {} as any);

        expect(result).toMatchObject({
            statusCode: 500,
            body: JSON.stringify({ error: errorMsg }),
        });
    });
});
