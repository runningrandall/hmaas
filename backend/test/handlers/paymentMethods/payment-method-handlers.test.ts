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

const mockCreatePaymentMethod = vi.fn();
const mockListPaymentMethodsByCustomer = vi.fn();
const mockDeletePaymentMethod = vi.fn();

vi.mock('../../../src/adapters/dynamo-payment-method-repository', () => ({
    DynamoPaymentMethodRepository: vi.fn().mockImplementation(function () { return {}; }),
}));

vi.mock('../../../src/adapters/event-bridge-publisher', () => ({
    EventBridgePublisher: vi.fn().mockImplementation(function () { return {}; }),
}));

vi.mock('../../../src/application/payment-method-service', () => ({
    PaymentMethodService: vi.fn().mockImplementation(function () {
        return {
            createPaymentMethod: mockCreatePaymentMethod,
            listPaymentMethodsByCustomer: mockListPaymentMethodsByCustomer,
            deletePaymentMethod: mockDeletePaymentMethod,
        };
    }),
}));

describe('Payment Method Handlers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('create handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/paymentMethods/create')).handler;
        });

        it('should return 201 when payment method is created with valid body and customerId', async () => {
            const mockPaymentMethod = {
                paymentMethodId: 'pm-123',
                customerId: 'cust-123',
                type: 'credit_card',
                last4: '4242',
            };
            mockCreatePaymentMethod.mockResolvedValue(mockPaymentMethod);

            const event = makeCreateEvent(
                { type: 'credit_card', last4: '4242' },
                { customerId: 'cust-123' },
            );
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(201);
            const body = JSON.parse(result.body);
            expect(body.paymentMethodId).toBe('pm-123');
            expect(body.customerId).toBe('cust-123');
            expect(body.type).toBe('credit_card');
        });

        it('should return 400 when customerId path param is missing', async () => {
            const event = makeCreateEvent({ type: 'credit_card', last4: '4242' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when body is missing', async () => {
            const event = makeCreateEvent({}, { customerId: 'cust-123' });
            (event as any).body = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when required body fields are missing', async () => {
            const event = makeCreateEvent({ type: 'credit_card' }, { customerId: 'cust-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when type is not a valid enum value', async () => {
            const event = makeCreateEvent(
                { type: 'paypal', last4: '4242' },
                { customerId: 'cust-123' },
            );
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when last4 is not exactly 4 characters', async () => {
            const event = makeCreateEvent(
                { type: 'credit_card', last4: '42' },
                { customerId: 'cust-123' },
            );
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });

    describe('list handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/paymentMethods/list')).handler;
        });

        it('should return 200 with payment methods when valid customerId provided', async () => {
            const mockList = { items: [{ paymentMethodId: 'pm-123', customerId: 'cust-123' }], cursor: undefined };
            mockListPaymentMethodsByCustomer.mockResolvedValue(mockList);

            const event = makeListEvent(null, { customerId: 'cust-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.items).toHaveLength(1);
            expect(mockListPaymentMethodsByCustomer).toHaveBeenCalledWith('org-test-123', 'cust-123', { limit: undefined, cursor: undefined });
        });

        it('should return 200 with pagination params passed to service', async () => {
            const mockList = { items: [{ paymentMethodId: 'pm-456' }], cursor: 'next-cursor' };
            mockListPaymentMethodsByCustomer.mockResolvedValue(mockList);

            const event = makeListEvent({ limit: '5', cursor: 'some-cursor' }, { customerId: 'cust-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            expect(mockListPaymentMethodsByCustomer).toHaveBeenCalledWith('org-test-123', 'cust-123', { limit: 5, cursor: 'some-cursor' });
        });

        it('should return 400 when customerId is missing', async () => {
            const event = makeListEvent(null, { customerId: 'cust-123' });
            (event as any).pathParameters = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });

    describe('delete handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/paymentMethods/delete')).handler;
        });

        it('should return 200 when payment method is deleted', async () => {
            mockDeletePaymentMethod.mockResolvedValue(undefined);

            const event = makeDeleteEvent({ paymentMethodId: 'pm-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.message).toBe('Payment method deleted');
        });

        it('should return 400 when paymentMethodId is missing', async () => {
            const event = makeDeleteEvent({ paymentMethodId: 'pm-123' });
            (event as any).pathParameters = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });
});
