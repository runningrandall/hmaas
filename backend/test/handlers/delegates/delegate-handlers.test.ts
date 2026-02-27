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

const mockCreateDelegate = vi.fn();
const mockListDelegatesByAccount = vi.fn();
const mockDeleteDelegate = vi.fn();

vi.mock('../../../src/adapters/dynamo-delegate-repository', () => ({
    DynamoDelegateRepository: vi.fn().mockImplementation(function () { return {}; }),
}));

vi.mock('../../../src/adapters/event-bridge-publisher', () => ({
    EventBridgePublisher: vi.fn().mockImplementation(function () { return {}; }),
}));

vi.mock('../../../src/application/delegate-service', () => ({
    DelegateService: vi.fn().mockImplementation(function () {
        return {
            createDelegate: mockCreateDelegate,
            listDelegatesByAccount: mockListDelegatesByAccount,
            deleteDelegate: mockDeleteDelegate,
        };
    }),
}));

describe('Delegate Handlers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('create handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/delegates/create')).handler;
        });

        it('should return 201 when delegate is created with valid body', async () => {
            const mockDelegate = {
                delegateId: 'del-123',
                accountId: 'acct-123',
                email: 'delegate@example.com',
                name: 'Jane Smith',
            };
            mockCreateDelegate.mockResolvedValue(mockDelegate);

            const event = makeCreateEvent(
                { email: 'delegate@example.com', name: 'Jane Smith' },
                { accountId: 'acct-123' },
            );
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(201);
            const body = JSON.parse(result.body);
            expect(body.delegateId).toBe('del-123');
            expect(body.email).toBe('delegate@example.com');
        });

        it('should return 400 when accountId path param is missing', async () => {
            const event = makeCreateEvent({ email: 'delegate@example.com', name: 'Jane Smith' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when body is missing', async () => {
            const event = makeCreateEvent({}, { accountId: 'acct-123' });
            (event as any).body = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when required fields are missing', async () => {
            const event = makeCreateEvent({ email: 'delegate@example.com' }, { accountId: 'acct-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when email is invalid', async () => {
            const event = makeCreateEvent(
                { email: 'not-an-email', name: 'Jane Smith' },
                { accountId: 'acct-123' },
            );
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should call createDelegate with accountId and parsed data', async () => {
            const mockDelegate = { delegateId: 'del-456', accountId: 'acct-456', email: 'other@example.com', name: 'Bob Jones' };
            mockCreateDelegate.mockResolvedValue(mockDelegate);

            const event = makeCreateEvent(
                { email: 'other@example.com', name: 'Bob Jones' },
                { accountId: 'acct-456' },
            );
            await handler(event, mockContext);

            expect(mockCreateDelegate).toHaveBeenCalledWith(
                'org-test-123',
                expect.objectContaining({ email: 'other@example.com', name: 'Bob Jones', accountId: 'acct-456' }),
            );
        });
    });

    describe('list handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/delegates/list')).handler;
        });

        it('should return 200 with delegates when valid accountId provided', async () => {
            const mockList = { items: [{ delegateId: 'del-123', accountId: 'acct-123' }], cursor: undefined };
            mockListDelegatesByAccount.mockResolvedValue(mockList);

            const event = makeListEvent(null, { accountId: 'acct-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.items).toHaveLength(1);
        });

        it('should return 400 when accountId is missing', async () => {
            const event = makeListEvent();
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should pass limit and cursor to service', async () => {
            const mockList = { items: [], cursor: 'next-cursor' };
            mockListDelegatesByAccount.mockResolvedValue(mockList);

            const event = makeListEvent({ limit: '10', cursor: 'some-cursor' }, { accountId: 'acct-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            expect(mockListDelegatesByAccount).toHaveBeenCalledWith('org-test-123', 'acct-123', { limit: 10, cursor: 'some-cursor' });
        });
    });

    describe('delete handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/delegates/delete')).handler;
        });

        it('should return 200 with message when delegate is deleted', async () => {
            mockDeleteDelegate.mockResolvedValue(undefined);

            const event = makeDeleteEvent({ delegateId: 'del-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.message).toBe('Delegate deleted');
        });

        it('should return 400 when delegateId is missing', async () => {
            const event = makeDeleteEvent({ delegateId: 'del-123' });
            (event as any).pathParameters = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should call deleteDelegate with the correct id', async () => {
            mockDeleteDelegate.mockResolvedValue(undefined);

            const event = makeDeleteEvent({ delegateId: 'del-789' });
            await handler(event, mockContext);

            expect(mockDeleteDelegate).toHaveBeenCalledWith('org-test-123', 'del-789');
        });
    });
});
