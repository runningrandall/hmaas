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

const mockCreateEmployee = vi.fn();
const mockGetEmployee = vi.fn();
const mockListEmployees = vi.fn();
const mockUpdateEmployee = vi.fn();
const mockDeleteEmployee = vi.fn();

vi.mock('../../../src/adapters/dynamo-employee-repository', () => ({
    DynamoEmployeeRepository: vi.fn().mockImplementation(function () { return {}; }),
}));

vi.mock('../../../src/adapters/event-bridge-publisher', () => ({
    EventBridgePublisher: vi.fn().mockImplementation(function () { return {}; }),
}));

vi.mock('../../../src/application/employee-service', () => ({
    EmployeeService: vi.fn().mockImplementation(function () {
        return {
            createEmployee: mockCreateEmployee,
            getEmployee: mockGetEmployee,
            listEmployees: mockListEmployees,
            updateEmployee: mockUpdateEmployee,
            deleteEmployee: mockDeleteEmployee,
        };
    }),
}));

describe('Employee Handlers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('create handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/employees/create')).handler;
        });

        it('should return 201 when employee is created with valid body', async () => {
            const mockEmployee = {
                employeeId: 'emp-123',
                firstName: 'Jane',
                lastName: 'Doe',
                email: 'jane.doe@versa.com',
                role: 'Field Technician',
            };
            mockCreateEmployee.mockResolvedValue(mockEmployee);

            const event = makeCreateEvent({
                firstName: 'Jane',
                lastName: 'Doe',
                email: 'jane.doe@versa.com',
                role: 'Field Technician',
            });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(201);
            const body = JSON.parse(result.body);
            expect(body.employeeId).toBe('emp-123');
            expect(body.firstName).toBe('Jane');
            expect(body.email).toBe('jane.doe@versa.com');
        });

        it('should return 400 when body is missing', async () => {
            const event = makeCreateEvent({});
            (event as any).body = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when required fields are missing', async () => {
            const event = makeCreateEvent({ firstName: 'Jane', lastName: 'Doe' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when email is invalid', async () => {
            const event = makeCreateEvent({
                firstName: 'Jane',
                lastName: 'Doe',
                email: 'not-an-email',
                role: 'Field Technician',
            });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });

    describe('get handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/employees/get')).handler;
        });

        it('should return 200 with employee when valid employeeId provided', async () => {
            const mockEmployee = {
                employeeId: 'emp-123',
                firstName: 'Jane',
                lastName: 'Doe',
                email: 'jane.doe@versa.com',
                role: 'Field Technician',
            };
            mockGetEmployee.mockResolvedValue(mockEmployee);

            const event = makeGetEvent({ employeeId: 'emp-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.employeeId).toBe('emp-123');
            expect(body.firstName).toBe('Jane');
        });

        it('should return 400 when employeeId is missing', async () => {
            const event = makeGetEvent({ employeeId: 'emp-123' });
            (event as any).pathParameters = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });

    describe('list handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/employees/list')).handler;
        });

        it('should return 200 with employees when no params provided', async () => {
            const mockList = {
                items: [{ employeeId: 'emp-123', firstName: 'Jane', lastName: 'Doe' }],
                cursor: undefined,
            };
            mockListEmployees.mockResolvedValue(mockList);

            const event = makeListEvent();
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.items).toHaveLength(1);
        });

        it('should return 200 with employees when limit and cursor params provided', async () => {
            const mockList = {
                items: [{ employeeId: 'emp-456', firstName: 'John', lastName: 'Smith' }],
                cursor: 'next-cursor',
            };
            mockListEmployees.mockResolvedValue(mockList);

            const event = makeListEvent({ limit: '10', cursor: 'some-cursor' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.items).toHaveLength(1);
            expect(mockListEmployees).toHaveBeenCalledWith({ limit: 10, cursor: 'some-cursor' });
        });
    });

    describe('update handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/employees/update')).handler;
        });

        it('should return 200 when employee is updated with valid data', async () => {
            const mockUpdated = {
                employeeId: 'emp-123',
                firstName: 'Jane',
                lastName: 'Doe',
                role: 'Senior Technician',
            };
            mockUpdateEmployee.mockResolvedValue(mockUpdated);

            const event = makeUpdateEvent({ employeeId: 'emp-123' }, { role: 'Senior Technician' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.employeeId).toBe('emp-123');
            expect(body.role).toBe('Senior Technician');
        });

        it('should return 400 when employeeId is missing', async () => {
            const event = makeUpdateEvent({ employeeId: 'emp-123' }, { role: 'Senior Technician' });
            (event as any).pathParameters = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when body is missing', async () => {
            const event = makeUpdateEvent({ employeeId: 'emp-123' }, {});
            (event as any).body = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });

    describe('delete handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/employees/delete')).handler;
        });

        it('should return 200 when employee is deleted', async () => {
            mockDeleteEmployee.mockResolvedValue(undefined);

            const event = makeDeleteEvent({ employeeId: 'emp-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.message).toBe('Employee deleted');
        });

        it('should return 400 when employeeId is missing', async () => {
            const event = makeDeleteEvent({ employeeId: 'emp-123' });
            (event as any).pathParameters = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });
});
