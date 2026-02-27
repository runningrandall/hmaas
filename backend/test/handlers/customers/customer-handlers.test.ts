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

const mockCreateCustomer = vi.fn();
const mockGetCustomer = vi.fn();
const mockListCustomers = vi.fn();
const mockUpdateCustomer = vi.fn();
const mockDeleteCustomer = vi.fn();
const mockGetCustomerAccount = vi.fn();

vi.mock('../../../src/adapters/dynamo-customer-repository', () => ({
    DynamoCustomerRepository: vi.fn().mockImplementation(function () { return {}; }),
}));

vi.mock('../../../src/adapters/dynamo-account-repository', () => ({
    DynamoAccountRepository: vi.fn().mockImplementation(function () { return {}; }),
}));

vi.mock('../../../src/adapters/event-bridge-publisher', () => ({
    EventBridgePublisher: vi.fn().mockImplementation(function () { return {}; }),
}));

vi.mock('../../../src/application/customer-service', () => ({
    CustomerService: vi.fn().mockImplementation(function () {
        return {
            createCustomer: mockCreateCustomer,
            getCustomer: mockGetCustomer,
            listCustomers: mockListCustomers,
            updateCustomer: mockUpdateCustomer,
            deleteCustomer: mockDeleteCustomer,
            getCustomerAccount: mockGetCustomerAccount,
        };
    }),
}));

describe('Customer Handlers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('create handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/customers/create')).handler;
        });

        it('should return 201 when customer is created with valid body', async () => {
            const mockCustomer = {
                customerId: 'cust-123',
                firstName: 'John',
                lastName: 'Smith',
                email: 'john.smith@example.com',
            };
            mockCreateCustomer.mockResolvedValue(mockCustomer);

            const event = makeCreateEvent({ firstName: 'John', lastName: 'Smith', email: 'john.smith@example.com' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(201);
            const body = JSON.parse(result.body);
            expect(body.customerId).toBe('cust-123');
            expect(body.firstName).toBe('John');
        });

        it('should return 400 when body is missing', async () => {
            const event = makeCreateEvent({});
            (event as any).body = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when required fields are missing', async () => {
            const event = makeCreateEvent({ firstName: 'John' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when email is invalid', async () => {
            const event = makeCreateEvent({ firstName: 'John', lastName: 'Smith', email: 'not-an-email' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });

    describe('get handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/customers/get')).handler;
        });

        it('should return 200 with customer when valid customerId provided', async () => {
            const mockCustomer = { customerId: 'cust-123', firstName: 'John', lastName: 'Smith' };
            mockGetCustomer.mockResolvedValue(mockCustomer);

            const event = makeGetEvent({ customerId: 'cust-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.customerId).toBe('cust-123');
        });

        it('should return 400 when customerId is missing', async () => {
            const event = makeGetEvent({ customerId: 'cust-123' });
            (event as any).pathParameters = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });

    describe('list handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/customers/list')).handler;
        });

        it('should return 200 with customers when no params provided', async () => {
            const mockList = { items: [{ customerId: 'cust-123' }], cursor: undefined };
            mockListCustomers.mockResolvedValue(mockList);

            const event = makeListEvent();
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.items).toHaveLength(1);
        });

        it('should return 200 with customers when limit and cursor params provided', async () => {
            const mockList = { items: [{ customerId: 'cust-456' }], cursor: 'next-cursor' };
            mockListCustomers.mockResolvedValue(mockList);

            const event = makeListEvent({ limit: '10', cursor: 'some-cursor' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.items).toHaveLength(1);
            expect(mockListCustomers).toHaveBeenCalledWith('org-test-123', { limit: 10, cursor: 'some-cursor' });
        });
    });

    describe('update handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/customers/update')).handler;
        });

        it('should return 200 when customer is updated with valid data', async () => {
            const mockUpdated = { customerId: 'cust-123', firstName: 'Jane', lastName: 'Smith' };
            mockUpdateCustomer.mockResolvedValue(mockUpdated);

            const event = makeUpdateEvent({ customerId: 'cust-123' }, { firstName: 'Jane' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.customerId).toBe('cust-123');
        });

        it('should return 400 when customerId is missing', async () => {
            const event = makeUpdateEvent({ customerId: 'cust-123' }, { firstName: 'Jane' });
            (event as any).pathParameters = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when body is missing', async () => {
            const event = makeUpdateEvent({ customerId: 'cust-123' }, {});
            (event as any).body = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });

    describe('delete handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/customers/delete')).handler;
        });

        it('should return 200 when customer is deleted', async () => {
            mockDeleteCustomer.mockResolvedValue(undefined);

            const event = makeDeleteEvent({ customerId: 'cust-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.message).toBe('Customer deleted');
        });

        it('should return 400 when customerId is missing', async () => {
            const event = makeDeleteEvent({ customerId: 'cust-123' });
            (event as any).pathParameters = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });

    describe('getAccount handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/customers/getAccount')).handler;
        });

        it('should return 200 with account when valid customerId provided', async () => {
            const mockAccount = { accountId: 'acct-123', customerId: 'cust-123', status: 'active' };
            mockGetCustomerAccount.mockResolvedValue(mockAccount);

            const event = makeGetEvent({ customerId: 'cust-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.accountId).toBe('acct-123');
            expect(body.customerId).toBe('cust-123');
        });

        it('should return 400 when customerId is missing', async () => {
            const event = makeGetEvent({ customerId: 'cust-123' });
            (event as any).pathParameters = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });
});
