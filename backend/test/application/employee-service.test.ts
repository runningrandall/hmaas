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

const ORG_ID = 'org-test-123';

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
                organizationId: ORG_ID,
                employeeId: 'emp-1',
                ...request,
                status: 'active',
                createdAt: '2024-01-01T00:00:00.000Z',
            };

            mockRepo.create.mockResolvedValue(created);
            mockPublisher.publish.mockResolvedValue(undefined);

            const { metrics } = await import('../../src/lib/observability');

            const result = await service.createEmployee(ORG_ID, request as any);

            expect(result).toEqual(created);
            expect(mockRepo.create).toHaveBeenCalledOnce();
            expect(mockPublisher.publish).toHaveBeenCalledWith('EmployeeCreated', expect.objectContaining({
                organizationId: ORG_ID,
                employeeId: created.employeeId,
            }));
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

            const result = await service.createEmployee(ORG_ID, request as any);

            expect(result.status).toBe('active');
            expect(result.createdAt).toEqual(expect.any(String));
            expect(result.employeeId).toEqual(expect.any(String));
        });
    });

    describe('getEmployee', () => {
        it('should return employee when found', async () => {
            const employee = { organizationId: ORG_ID, employeeId: 'emp-1', firstName: 'Alice', status: 'active' };
            mockRepo.get.mockResolvedValue(employee);

            const result = await service.getEmployee(ORG_ID, 'emp-1');

            expect(result).toEqual(employee);
            expect(mockRepo.get).toHaveBeenCalledWith(ORG_ID, 'emp-1');
        });

        it('should throw AppError 404 when employee not found', async () => {
            mockRepo.get.mockResolvedValue(null);

            await expect(service.getEmployee(ORG_ID, 'missing')).rejects.toThrow(AppError);
            await expect(service.getEmployee(ORG_ID, 'missing')).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    describe('listEmployees', () => {
        it('should delegate to repo.list', async () => {
            const paginated = { items: [{ organizationId: ORG_ID, employeeId: 'emp-1' }], count: 1 };
            mockRepo.list.mockResolvedValue(paginated);

            const result = await service.listEmployees(ORG_ID, { limit: 20 });

            expect(result).toEqual(paginated);
            expect(mockRepo.list).toHaveBeenCalledWith(ORG_ID, { limit: 20 });
        });
    });

    describe('updateEmployee', () => {
        it('should update employee and return updated without publishing event', async () => {
            const existing = { organizationId: ORG_ID, employeeId: 'emp-1', firstName: 'Alice', status: 'active' };
            const updated = { organizationId: ORG_ID, employeeId: 'emp-1', firstName: 'Alice', phone: '555-9999', status: 'active' };
            mockRepo.get.mockResolvedValue(existing);
            mockRepo.update.mockResolvedValue(updated);

            const result = await service.updateEmployee(ORG_ID, 'emp-1', { phone: '555-9999' });

            expect(result).toEqual(updated);
            expect(mockPublisher.publish).not.toHaveBeenCalled();
        });

        it('should throw 404 if employee not found', async () => {
            mockRepo.get.mockResolvedValue(null);

            await expect(service.updateEmployee(ORG_ID, 'missing', { phone: '555-0000' })).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    describe('deleteEmployee', () => {
        it('should delete employee without publishing event', async () => {
            mockRepo.delete.mockResolvedValue(undefined);

            await service.deleteEmployee(ORG_ID, 'emp-1');

            expect(mockRepo.delete).toHaveBeenCalledWith(ORG_ID, 'emp-1');
            expect(mockPublisher.publish).not.toHaveBeenCalled();
        });
    });
});
