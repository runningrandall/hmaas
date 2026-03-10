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

const mockCreateSubcontractor = vi.fn();
const mockGetSubcontractor = vi.fn();
const mockListSubcontractors = vi.fn();
const mockUpdateSubcontractor = vi.fn();
const mockDeleteSubcontractor = vi.fn();

vi.mock('../../../src/adapters/dynamo-subcontractor-repository', () => ({
    DynamoSubcontractorRepository: vi.fn().mockImplementation(function () { return {}; }),
}));

vi.mock('../../../src/adapters/event-bridge-publisher', () => ({
    EventBridgePublisher: vi.fn().mockImplementation(function () { return {}; }),
}));

vi.mock('../../../src/application/subcontractor-service', () => ({
    SubcontractorService: vi.fn().mockImplementation(function () {
        return {
            createSubcontractor: mockCreateSubcontractor,
            getSubcontractor: mockGetSubcontractor,
            listSubcontractors: mockListSubcontractors,
            updateSubcontractor: mockUpdateSubcontractor,
            deleteSubcontractor: mockDeleteSubcontractor,
        };
    }),
}));

describe('Subcontractor Handlers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('create handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/subcontractors/create')).handler;
        });

        it('should return 201 when subcontractor is created with valid body', async () => {
            const mockSub = {
                subcontractorId: 'sub-123',
                name: 'ABC Lawn Care',
                email: 'abc@lawn.com',
                status: 'active',
            };
            mockCreateSubcontractor.mockResolvedValue(mockSub);

            const event = makeCreateEvent({
                name: 'ABC Lawn Care',
                email: 'abc@lawn.com',
            });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(201);
            const body = JSON.parse(result.body);
            expect(body.subcontractorId).toBe('sub-123');
            expect(body.name).toBe('ABC Lawn Care');
        });

        it('should return 400 when body is missing', async () => {
            const event = makeCreateEvent({});
            (event as any).body = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when required fields are missing', async () => {
            const event = makeCreateEvent({ name: 'ABC' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when email is invalid', async () => {
            const event = makeCreateEvent({ name: 'ABC', email: 'not-an-email' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });

    describe('get handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/subcontractors/get')).handler;
        });

        it('should return 200 with subcontractor when valid id provided', async () => {
            const mockSub = { subcontractorId: 'sub-123', name: 'ABC Lawn Care' };
            mockGetSubcontractor.mockResolvedValue(mockSub);

            const event = makeGetEvent({ subcontractorId: 'sub-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.subcontractorId).toBe('sub-123');
        });

        it('should return 400 when subcontractorId is missing', async () => {
            const event = makeGetEvent({ subcontractorId: 'sub-123' });
            (event as any).pathParameters = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });

    describe('list handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/subcontractors/list')).handler;
        });

        it('should return 200 with subcontractors list', async () => {
            const mockList = { items: [{ subcontractorId: 'sub-123' }], cursor: null };
            mockListSubcontractors.mockResolvedValue(mockList);

            const event = makeListEvent();
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.items).toHaveLength(1);
        });

        it('should pass pagination params', async () => {
            const mockList = { items: [], cursor: null };
            mockListSubcontractors.mockResolvedValue(mockList);

            const event = makeListEvent({ limit: '10', cursor: 'abc' });
            await handler(event, mockContext);

            expect(mockListSubcontractors).toHaveBeenCalledWith(expect.any(String), { limit: 10, cursor: 'abc' });
        });
    });

    describe('update handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/subcontractors/update')).handler;
        });

        it('should return 200 when updated with valid data', async () => {
            const mockUpdated = { subcontractorId: 'sub-123', name: 'ABC Updated' };
            mockUpdateSubcontractor.mockResolvedValue(mockUpdated);

            const event = makeUpdateEvent({ subcontractorId: 'sub-123' }, { name: 'ABC Updated' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.name).toBe('ABC Updated');
        });

        it('should return 400 when subcontractorId is missing', async () => {
            const event = makeUpdateEvent({ subcontractorId: 'sub-123' }, { name: 'X' });
            (event as any).pathParameters = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when body is missing', async () => {
            const event = makeUpdateEvent({ subcontractorId: 'sub-123' }, {});
            (event as any).body = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });

    describe('delete handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/subcontractors/delete')).handler;
        });

        it('should return 200 when subcontractor is deleted', async () => {
            mockDeleteSubcontractor.mockResolvedValue(undefined);

            const event = makeDeleteEvent({ subcontractorId: 'sub-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.message).toBe('Subcontractor deleted');
        });

        it('should return 400 when subcontractorId is missing', async () => {
            const event = makeDeleteEvent({ subcontractorId: 'sub-123' });
            (event as any).pathParameters = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });
});
