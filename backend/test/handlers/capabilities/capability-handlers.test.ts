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

const mockCreateCapability = vi.fn();
const mockListCapabilitiesByEmployee = vi.fn();
const mockDeleteCapability = vi.fn();

vi.mock('../../../src/adapters/dynamo-capability-repository', () => ({
    DynamoCapabilityRepository: vi.fn().mockImplementation(function () { return {}; }),
}));

vi.mock('../../../src/adapters/event-bridge-publisher', () => ({
    EventBridgePublisher: vi.fn().mockImplementation(function () { return {}; }),
}));

vi.mock('../../../src/application/capability-service', () => ({
    CapabilityService: vi.fn().mockImplementation(function () {
        return {
            createCapability: mockCreateCapability,
            listCapabilitiesByEmployee: mockListCapabilitiesByEmployee,
            deleteCapability: mockDeleteCapability,
        };
    }),
}));

describe('Capability Handlers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('create handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/capabilities/create')).handler;
        });

        it('should return 201 when capability is created with valid body and employeeId', async () => {
            const mockCapability = {
                capabilityId: 'cap-123',
                employeeId: 'emp-123',
                serviceTypeId: 'svc-type-001',
                level: 'intermediate',
            };
            mockCreateCapability.mockResolvedValue(mockCapability);

            const event = makeCreateEvent(
                { serviceTypeId: 'svc-type-001', level: 'intermediate' },
                { employeeId: 'emp-123' },
            );
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(201);
            const body = JSON.parse(result.body);
            expect(body.capabilityId).toBe('cap-123');
            expect(body.employeeId).toBe('emp-123');
        });

        it('should return 400 when employeeId path param is missing', async () => {
            const event = makeCreateEvent({ serviceTypeId: 'svc-type-001', level: 'intermediate' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when body is missing', async () => {
            const event = makeCreateEvent({}, { employeeId: 'emp-123' });
            (event as any).body = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when required body fields are missing', async () => {
            const event = makeCreateEvent({ serviceTypeId: 'svc-type-001' }, { employeeId: 'emp-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when level is not a valid enum value', async () => {
            const event = makeCreateEvent(
                { serviceTypeId: 'svc-type-001', level: 'novice' },
                { employeeId: 'emp-123' },
            );
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });

    describe('list handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/capabilities/list')).handler;
        });

        it('should return 200 with capabilities when valid employeeId provided', async () => {
            const mockList = { items: [{ capabilityId: 'cap-123', employeeId: 'emp-123' }], cursor: undefined };
            mockListCapabilitiesByEmployee.mockResolvedValue(mockList);

            const event = makeListEvent(null, { employeeId: 'emp-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.items).toHaveLength(1);
            expect(mockListCapabilitiesByEmployee).toHaveBeenCalledWith('org-test-123', 'emp-123', { limit: undefined, cursor: undefined });
        });

        it('should return 200 with pagination params passed to service', async () => {
            const mockList = { items: [{ capabilityId: 'cap-456' }], cursor: 'next-cursor' };
            mockListCapabilitiesByEmployee.mockResolvedValue(mockList);

            const event = makeListEvent({ limit: '5', cursor: 'some-cursor' }, { employeeId: 'emp-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            expect(mockListCapabilitiesByEmployee).toHaveBeenCalledWith('org-test-123', 'emp-123', { limit: 5, cursor: 'some-cursor' });
        });

        it('should return 400 when employeeId is missing', async () => {
            const event = makeListEvent(null, { employeeId: 'emp-123' });
            (event as any).pathParameters = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });

    describe('delete handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/capabilities/delete')).handler;
        });

        it('should return 200 when capability is deleted', async () => {
            mockDeleteCapability.mockResolvedValue(undefined);

            const event = makeDeleteEvent({ capabilityId: 'cap-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.message).toBe('Capability deleted');
        });

        it('should return 400 when capabilityId is missing', async () => {
            const event = makeDeleteEvent({ capabilityId: 'cap-123' });
            (event as any).pathParameters = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });
});
