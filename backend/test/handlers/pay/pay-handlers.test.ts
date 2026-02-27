import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeCreateEvent, makeListEvent, makeUpdateEvent, makeDeleteEvent, mockContext } from '../../helpers/test-utils';

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

const mockCreatePay = vi.fn();
const mockListPayByEmployee = vi.fn();
const mockUpdatePay = vi.fn();
const mockDeletePay = vi.fn();

vi.mock('../../../src/adapters/dynamo-pay-repository', () => ({
    DynamoPayRepository: vi.fn().mockImplementation(function () { return {}; }),
}));

vi.mock('../../../src/application/pay-service', () => ({
    PayService: vi.fn().mockImplementation(function () {
        return {
            createPay: mockCreatePay,
            listPayByEmployee: mockListPayByEmployee,
            updatePay: mockUpdatePay,
            deletePay: mockDeletePay,
        };
    }),
}));

describe('Pay Handlers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('create handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/pay/create')).handler;
        });

        it('should return 201 when pay record is created with valid body', async () => {
            const mockPay = {
                payId: 'pay-123',
                employeeId: 'emp-123',
                payType: 'hourly',
                rate: 5000,
                effectiveDate: '2026-01-01',
            };
            mockCreatePay.mockResolvedValue(mockPay);

            const event = makeCreateEvent(
                { payType: 'hourly', rate: 5000, effectiveDate: '2026-01-01' },
                { employeeId: 'emp-123' },
            );
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(201);
            const body = JSON.parse(result.body);
            expect(body.payId).toBe('pay-123');
            expect(body.payType).toBe('hourly');
        });

        it('should return 400 when employeeId path param is missing', async () => {
            const event = makeCreateEvent({ payType: 'hourly', rate: 5000, effectiveDate: '2026-01-01' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when body is missing', async () => {
            const event = makeCreateEvent({}, { employeeId: 'emp-123' });
            (event as any).body = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when required fields are missing', async () => {
            const event = makeCreateEvent({ payType: 'hourly' }, { employeeId: 'emp-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when payType is invalid', async () => {
            const event = makeCreateEvent(
                { payType: 'weekly', rate: 5000, effectiveDate: '2026-01-01' },
                { employeeId: 'emp-123' },
            );
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when rate is negative', async () => {
            const event = makeCreateEvent(
                { payType: 'hourly', rate: -100, effectiveDate: '2026-01-01' },
                { employeeId: 'emp-123' },
            );
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should call createPay with employeeId and parsed data', async () => {
            const mockPay = { payId: 'pay-456', employeeId: 'emp-456', payType: 'salary', rate: 8000000, effectiveDate: '2026-06-01' };
            mockCreatePay.mockResolvedValue(mockPay);

            const event = makeCreateEvent(
                { payType: 'salary', rate: 8000000, effectiveDate: '2026-06-01' },
                { employeeId: 'emp-456' },
            );
            await handler(event, mockContext);

            expect(mockCreatePay).toHaveBeenCalledWith(
                'org-test-123',
                expect.objectContaining({ payType: 'salary', rate: 8000000, effectiveDate: '2026-06-01', employeeId: 'emp-456' }),
            );
        });
    });

    describe('list handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/pay/list')).handler;
        });

        it('should return 200 with pay records when valid employeeId provided', async () => {
            const mockList = { items: [{ payId: 'pay-123', employeeId: 'emp-123' }], cursor: undefined };
            mockListPayByEmployee.mockResolvedValue(mockList);

            const event = makeListEvent(null, { employeeId: 'emp-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.items).toHaveLength(1);
        });

        it('should return 400 when employeeId is missing', async () => {
            const event = makeListEvent();
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should pass limit and cursor to service', async () => {
            const mockList = { items: [], cursor: 'next-cursor' };
            mockListPayByEmployee.mockResolvedValue(mockList);

            const event = makeListEvent({ limit: '10', cursor: 'some-cursor' }, { employeeId: 'emp-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            expect(mockListPayByEmployee).toHaveBeenCalledWith('org-test-123', 'emp-123', { limit: 10, cursor: 'some-cursor' });
        });
    });

    describe('update handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/pay/update')).handler;
        });

        it('should return 200 when pay record is updated', async () => {
            const mockUpdated = { payId: 'pay-123', payType: 'salary', rate: 9000000 };
            mockUpdatePay.mockResolvedValue(mockUpdated);

            const event = makeUpdateEvent({ payId: 'pay-123' }, { payType: 'salary', rate: 9000000 });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.payId).toBe('pay-123');
        });

        it('should return 400 when payId is missing', async () => {
            const event = makeUpdateEvent({ payId: 'pay-123' }, { payType: 'salary' });
            (event as any).pathParameters = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when body is missing', async () => {
            const event = makeUpdateEvent({ payId: 'pay-123' }, {});
            (event as any).body = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when payType is invalid', async () => {
            const event = makeUpdateEvent({ payId: 'pay-123' }, { payType: 'overtime' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });

    describe('delete handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/pay/delete')).handler;
        });

        it('should return 200 with message when pay record is deleted', async () => {
            mockDeletePay.mockResolvedValue(undefined);

            const event = makeDeleteEvent({ payId: 'pay-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.message).toBe('Pay record deleted');
        });

        it('should return 400 when payId is missing', async () => {
            const event = makeDeleteEvent({ payId: 'pay-123' });
            (event as any).pathParameters = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should call deletePay with the correct id', async () => {
            mockDeletePay.mockResolvedValue(undefined);

            const event = makeDeleteEvent({ payId: 'pay-789' });
            await handler(event, mockContext);

            expect(mockDeletePay).toHaveBeenCalledWith('org-test-123', 'pay-789');
        });
    });
});
