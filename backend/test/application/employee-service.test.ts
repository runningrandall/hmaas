import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/observability', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), addContext: vi.fn() },
    tracer: { captureAWSv3Client: (c: any) => c },
    metrics: { addMetric: vi.fn() },
}));

import { EmployeeService } from '../../src/application/employee-service';
import { AppError } from '../../src/lib/error';

const mockRepo = {
    create: vi.fn(),
    get: vi.fn(),
    list: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
};

const mockPublisher = { publish: vi.fn() };

describe('EmployeeService', () => {
    let service: EmployeeService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new EmployeeService(mockRepo as any, mockPublisher as any);
    });

    describe('createEmployee', () => {
        it('should create employee with active status, publish EmployeeCreated event, and record metric', async () => {
            const request = {
                firstName: 'Alice',
                lastName: 'Johnson',
                email: 'alice@versa.com',
                phone: '555-0300',
                role: 'servicer',
                hireDate: '2024-01-01',
            };

            const created = {
                employeeId: 'emp-1',
                ...request,
                status: 'active',
                createdAt: '2024-01-01T00:00:00.000Z',
            };

            mockRepo.create.mockResolvedValue(created);
            mockPublisher.publish.mockResolvedValue(undefined);

            const { metrics } = await import('../../src/lib/observability');

            const result = await service.createEmployee(request as any);

            expect(result).toEqual(created);
            expect(mockRepo.create).toHaveBeenCalledOnce();
            expect(mockPublisher.publish).toHaveBeenCalledWith('EmployeeCreated', { employeeId: created.employeeId });
            expect(metrics.addMetric).toHaveBeenCalledWith('EmployeesCreated', expect.any(String), 1);
        });

        it('should set status to active and populate createdAt and employeeId', async () => {
            const request = {
                firstName: 'Bob',
                lastName: 'Lee',
                email: 'bob@versa.com',
                phone: '555-0400',
                role: 'manager',
                hireDate: '2024-06-01',
            };

            mockRepo.create.mockImplementation(async (e: any) => e);
            mockPublisher.publish.mockResolvedValue(undefined);

            const result = await service.createEmployee(request as any);

            expect(result.status).toBe('active');
            expect(result.createdAt).toEqual(expect.any(String));
            expect(result.employeeId).toEqual(expect.any(String));
        });
    });

    describe('getEmployee', () => {
        it('should return employee when found', async () => {
            const employee = { employeeId: 'emp-1', firstName: 'Alice', status: 'active' };
            mockRepo.get.mockResolvedValue(employee);

            const result = await service.getEmployee('emp-1');

            expect(result).toEqual(employee);
            expect(mockRepo.get).toHaveBeenCalledWith('emp-1');
        });

        it('should throw AppError 404 when employee not found', async () => {
            mockRepo.get.mockResolvedValue(null);

            await expect(service.getEmployee('missing')).rejects.toThrow(AppError);
            await expect(service.getEmployee('missing')).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    describe('listEmployees', () => {
        it('should delegate to repo.list', async () => {
            const paginated = { items: [{ employeeId: 'emp-1' }], count: 1 };
            mockRepo.list.mockResolvedValue(paginated);

            const result = await service.listEmployees({ limit: 20 });

            expect(result).toEqual(paginated);
            expect(mockRepo.list).toHaveBeenCalledWith({ limit: 20 });
        });
    });

    describe('updateEmployee', () => {
        it('should update employee and return updated without publishing event', async () => {
            const existing = { employeeId: 'emp-1', firstName: 'Alice', status: 'active' };
            const updated = { employeeId: 'emp-1', firstName: 'Alice', phone: '555-9999', status: 'active' };
            mockRepo.get.mockResolvedValue(existing);
            mockRepo.update.mockResolvedValue(updated);

            const result = await service.updateEmployee('emp-1', { phone: '555-9999' });

            expect(result).toEqual(updated);
            expect(mockPublisher.publish).not.toHaveBeenCalled();
        });

        it('should throw 404 if employee not found', async () => {
            mockRepo.get.mockResolvedValue(null);

            await expect(service.updateEmployee('missing', { phone: '555-0000' })).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    describe('deleteEmployee', () => {
        it('should delete employee without publishing event', async () => {
            mockRepo.delete.mockResolvedValue(undefined);

            await service.deleteEmployee('emp-1');

            expect(mockRepo.delete).toHaveBeenCalledWith('emp-1');
            expect(mockPublisher.publish).not.toHaveBeenCalled();
        });
    });
});
