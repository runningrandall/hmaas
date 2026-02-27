import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/observability', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    tracer: { captureAWSv3Client: (c: any) => c },
    metrics: { addMetric: vi.fn() },
}));

vi.mock('../../src/entities/service', () => ({
    DBService: {
        entities: {
            employee: {
                create: vi.fn(),
                get: vi.fn(),
                scan: { go: vi.fn() },
                patch: vi.fn(),
                delete: vi.fn(),
            },
        },
    },
}));

import { DynamoEmployeeRepository } from '../../src/adapters/dynamo-employee-repository';
import { DBService } from '../../src/entities/service';

const mockEmployee = {
    employeeId: 'emp-1',
    firstName: 'Alice',
    lastName: 'Smith',
    email: 'alice@example.com',
    phone: '555-5678',
    role: 'technician',
    status: 'active' as const,
    hireDate: '2022-06-01',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
};

describe('DynamoEmployeeRepository', () => {
    let repo: DynamoEmployeeRepository;
    const mockEntity = (DBService.entities.employee as any);

    beforeEach(() => {
        vi.clearAllMocks();
        repo = new DynamoEmployeeRepository();
    });

    describe('create', () => {
        it('should create an employee and return the parsed result', async () => {
            mockEntity.create.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: mockEmployee }) });

            const result = await repo.create(mockEmployee);

            expect(result.employeeId).toBe('emp-1');
            expect(result.firstName).toBe('Alice');
        });

        it('should throw Data integrity error when create returns invalid data', async () => {
            mockEntity.create.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: { employeeId: 'emp-1' } }) });

            await expect(repo.create(mockEmployee)).rejects.toThrow('Data integrity error');
        });
    });

    describe('get', () => {
        it('should return a parsed employee when found', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: mockEmployee }) });

            const result = await repo.get('emp-1');

            expect(result).not.toBeNull();
            expect(result!.employeeId).toBe('emp-1');
        });

        it('should return null when employee not found', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: null }) });

            const result = await repo.get('emp-1');

            expect(result).toBeNull();
        });

        it('should throw Data integrity error when get returns invalid data', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: { badField: true } }) });

            await expect(repo.get('emp-1')).rejects.toThrow('Data integrity error');
        });
    });

    describe('list', () => {
        it('should return paginated list of employees', async () => {
            mockEntity.scan.go.mockResolvedValue({ data: [mockEmployee], cursor: null });

            const result = await repo.list();

            expect(result.items).toHaveLength(1);
            expect(result.items[0].employeeId).toBe('emp-1');
            expect(result.cursor).toBeNull();
        });

        it('should pass limit and cursor options to scan', async () => {
            mockEntity.scan.go.mockResolvedValue({ data: [mockEmployee], cursor: 'next-page' });

            const result = await repo.list({ limit: 5, cursor: 'some-cursor' });

            expect(mockEntity.scan.go).toHaveBeenCalledWith({ limit: 5, cursor: 'some-cursor' });
            expect(result.cursor).toBe('next-page');
        });

        it('should use default page size when no options provided', async () => {
            mockEntity.scan.go.mockResolvedValue({ data: [], cursor: null });

            await repo.list();

            expect(mockEntity.scan.go).toHaveBeenCalledWith({ limit: 20 });
        });
    });

    describe('update', () => {
        it('should update an employee and return the parsed result', async () => {
            const updated = { ...mockEmployee, role: 'manager' };
            mockEntity.patch.mockReturnValue({
                set: vi.fn().mockReturnValue({ go: vi.fn().mockResolvedValue({ data: updated }) }),
            });

            const result = await repo.update('emp-1', { role: 'manager' });

            expect(result.role).toBe('manager');
        });

        it('should throw Data integrity error when update returns invalid data', async () => {
            mockEntity.patch.mockReturnValue({
                set: vi.fn().mockReturnValue({ go: vi.fn().mockResolvedValue({ data: { badField: true } }) }),
            });

            await expect(repo.update('emp-1', { role: 'manager' })).rejects.toThrow('Data integrity error');
        });
    });

    describe('delete', () => {
        it('should delete an employee', async () => {
            mockEntity.delete.mockReturnValue({ go: vi.fn().mockResolvedValue({}) });

            await expect(repo.delete('emp-1')).resolves.toBeUndefined();
            expect(mockEntity.delete).toHaveBeenCalledWith({ employeeId: 'emp-1' });
        });
    });
});
