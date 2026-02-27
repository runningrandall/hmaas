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

const mockCreatePaySchedule = vi.fn();
const mockGetPaySchedule = vi.fn();
const mockListPaySchedules = vi.fn();
const mockUpdatePaySchedule = vi.fn();
const mockDeletePaySchedule = vi.fn();

vi.mock('../../../src/adapters/dynamo-pay-schedule-repository', () => ({
    DynamoPayScheduleRepository: vi.fn().mockImplementation(function () { return {}; }),
}));

vi.mock('../../../src/application/pay-schedule-service', () => ({
    PayScheduleService: vi.fn().mockImplementation(function () {
        return {
            createPaySchedule: mockCreatePaySchedule,
            getPaySchedule: mockGetPaySchedule,
            listPaySchedules: mockListPaySchedules,
            updatePaySchedule: mockUpdatePaySchedule,
            deletePaySchedule: mockDeletePaySchedule,
        };
    }),
}));

describe('Pay Schedule Handlers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('create handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/paySchedules/create')).handler;
        });

        it('should return 201 when pay schedule is created with valid body', async () => {
            const mockSchedule = {
                payScheduleId: 'ps-123',
                name: 'Bi-Weekly Friday',
                frequency: 'biweekly',
            };
            mockCreatePaySchedule.mockResolvedValue(mockSchedule);

            const event = makeCreateEvent({ name: 'Bi-Weekly Friday', frequency: 'biweekly' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(201);
            const body = JSON.parse(result.body);
            expect(body.payScheduleId).toBe('ps-123');
            expect(body.frequency).toBe('biweekly');
        });

        it('should return 400 when body is missing', async () => {
            const event = makeCreateEvent({});
            (event as any).body = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when required fields are missing', async () => {
            const event = makeCreateEvent({ name: 'Weekly' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when frequency is invalid', async () => {
            const event = makeCreateEvent({ name: 'Daily', frequency: 'daily' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should call createPaySchedule with parsed data', async () => {
            const mockSchedule = { payScheduleId: 'ps-456', name: 'Monthly 15th', frequency: 'monthly', dayOfMonth: 15 };
            mockCreatePaySchedule.mockResolvedValue(mockSchedule);

            const event = makeCreateEvent({ name: 'Monthly 15th', frequency: 'monthly', dayOfMonth: 15 });
            await handler(event, mockContext);

            expect(mockCreatePaySchedule).toHaveBeenCalledWith(
                'org-test-123',
                expect.objectContaining({ name: 'Monthly 15th', frequency: 'monthly', dayOfMonth: 15 }),
            );
        });
    });

    describe('get handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/paySchedules/get')).handler;
        });

        it('should return 200 with pay schedule when valid payScheduleId provided', async () => {
            const mockSchedule = { payScheduleId: 'ps-123', name: 'Bi-Weekly', frequency: 'biweekly' };
            mockGetPaySchedule.mockResolvedValue(mockSchedule);

            const event = makeGetEvent({ payScheduleId: 'ps-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.payScheduleId).toBe('ps-123');
        });

        it('should return 400 when payScheduleId is missing', async () => {
            const event = makeGetEvent({ payScheduleId: 'ps-123' });
            (event as any).pathParameters = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should call getPaySchedule with the correct id', async () => {
            const mockSchedule = { payScheduleId: 'ps-456', name: 'Weekly', frequency: 'weekly' };
            mockGetPaySchedule.mockResolvedValue(mockSchedule);

            const event = makeGetEvent({ payScheduleId: 'ps-456' });
            await handler(event, mockContext);

            expect(mockGetPaySchedule).toHaveBeenCalledWith('org-test-123', 'ps-456');
        });
    });

    describe('list handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/paySchedules/list')).handler;
        });

        it('should return 200 with pay schedules when no params provided', async () => {
            const mockList = { items: [{ payScheduleId: 'ps-123', name: 'Bi-Weekly', frequency: 'biweekly' }], cursor: undefined };
            mockListPaySchedules.mockResolvedValue(mockList);

            const event = makeListEvent();
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.items).toHaveLength(1);
        });

        it('should pass limit and cursor to service', async () => {
            const mockList = { items: [], cursor: 'next-cursor' };
            mockListPaySchedules.mockResolvedValue(mockList);

            const event = makeListEvent({ limit: '10', cursor: 'some-cursor' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            expect(mockListPaySchedules).toHaveBeenCalledWith('org-test-123', { limit: 10, cursor: 'some-cursor' });
        });
    });

    describe('update handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/paySchedules/update')).handler;
        });

        it('should return 200 when pay schedule is updated', async () => {
            const mockUpdated = { payScheduleId: 'ps-123', name: 'Monthly 1st', frequency: 'monthly' };
            mockUpdatePaySchedule.mockResolvedValue(mockUpdated);

            const event = makeUpdateEvent({ payScheduleId: 'ps-123' }, { frequency: 'monthly' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.payScheduleId).toBe('ps-123');
        });

        it('should return 400 when payScheduleId is missing', async () => {
            const event = makeUpdateEvent({ payScheduleId: 'ps-123' }, { frequency: 'monthly' });
            (event as any).pathParameters = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when body is missing', async () => {
            const event = makeUpdateEvent({ payScheduleId: 'ps-123' }, {});
            (event as any).body = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when frequency is invalid', async () => {
            const event = makeUpdateEvent({ payScheduleId: 'ps-123' }, { frequency: 'quarterly' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });

    describe('delete handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/paySchedules/delete')).handler;
        });

        it('should return 200 with message when pay schedule is deleted', async () => {
            mockDeletePaySchedule.mockResolvedValue(undefined);

            const event = makeDeleteEvent({ payScheduleId: 'ps-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.message).toBe('Pay schedule deleted');
        });

        it('should return 400 when payScheduleId is missing', async () => {
            const event = makeDeleteEvent({ payScheduleId: 'ps-123' });
            (event as any).pathParameters = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should call deletePaySchedule with the correct id', async () => {
            mockDeletePaySchedule.mockResolvedValue(undefined);

            const event = makeDeleteEvent({ payScheduleId: 'ps-789' });
            await handler(event, mockContext);

            expect(mockDeletePaySchedule).toHaveBeenCalledWith('org-test-123', 'ps-789');
        });
    });
});
