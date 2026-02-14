import { vi, describe, it, expect, beforeEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { EventBridgePublisher } from '../../src/adapters/event-bridge-publisher';

const ebMock = mockClient(EventBridgeClient);

// Mock tracer to pass through the client
vi.mock('../../src/lib/observability', () => ({
    tracer: { captureAWSv3Client: (c: any) => c },
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}));

describe('EventBridgePublisher', () => {
    beforeEach(() => {
        ebMock.reset();
        vi.clearAllMocks();
    });

    it('should publish an event to EventBridge', async () => {
        ebMock.on(PutEventsCommand).resolves({});
        const publisher = new EventBridgePublisher('test-bus');

        await publisher.publish('ItemCreated', { itemId: '123', name: 'Test' });

        expect(ebMock.calls()).toHaveLength(1);
        const callArgs = ebMock.call(0).args[0].input;
        expect(callArgs).toEqual(expect.objectContaining({
            Entries: [{
                Source: 'test.api',
                DetailType: 'ItemCreated',
                Detail: JSON.stringify({ itemId: '123', name: 'Test' }),
                EventBusName: 'test-bus',
            }],
        }));
    });

    it('should skip publishing when busName is empty', async () => {
        const publisher = new EventBridgePublisher('');

        await publisher.publish('ItemCreated', { itemId: '123' });

        expect(ebMock.calls()).toHaveLength(0);
    });

    it('should not throw when EventBridge send fails', async () => {
        ebMock.on(PutEventsCommand).rejects(new Error('EventBridge error'));
        const publisher = new EventBridgePublisher('test-bus');

        // Should not throw — error is logged but swallowed
        await expect(publisher.publish('ItemCreated', { itemId: '123' })).resolves.toBeUndefined();
    });
});
