import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/observability', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    tracer: { captureAWSv3Client: (c: any) => c },
    metrics: { addMetric: vi.fn() },
}));

vi.mock('../../src/entities/service', () => ({
    DBService: {
        entities: {
            customer: {
                create: vi.fn(),
                get: vi.fn(),
                scan: { go: vi.fn() },
                patch: vi.fn(),
                delete: vi.fn(),
            },
        },
    },
}));

import { DynamoCustomerRepository } from '../../src/adapters/dynamo-customer-repository';
import { DBService } from '../../src/entities/service';

const mockCustomer = {
    customerId: 'cust-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '555-1234',
    status: 'active' as const,
    notes: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
};

describe('DynamoCustomerRepository', () => {
    let repo: DynamoCustomerRepository;
    const mockEntity = (DBService.entities.customer as any);

    beforeEach(() => {
        vi.clearAllMocks();
        repo = new DynamoCustomerRepository();
    });

    describe('create', () => {
        it('should create a customer and return the parsed result', async () => {
            mockEntity.create.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: mockCustomer }) });

            const result = await repo.create(mockCustomer);

            expect(mockEntity.create).toHaveBeenCalled();
            expect(result.customerId).toBe('cust-1');
            expect(result.firstName).toBe('John');
        });

        it('should throw Data integrity error when create returns invalid data', async () => {
            mockEntity.create.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: { customerId: 'cust-1' } }) });

            await expect(repo.create(mockCustomer)).rejects.toThrow('Data integrity error');
        });
    });

    describe('get', () => {
        it('should return a parsed customer when found', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: mockCustomer }) });

            const result = await repo.get('cust-1');

            expect(result).not.toBeNull();
            expect(result!.customerId).toBe('cust-1');
        });

        it('should return null when customer not found', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: null }) });

            const result = await repo.get('cust-1');

            expect(result).toBeNull();
        });

        it('should throw Data integrity error when get returns invalid data', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: { badField: true } }) });

            await expect(repo.get('cust-1')).rejects.toThrow('Data integrity error');
        });
    });

    describe('list', () => {
        it('should return paginated list of customers', async () => {
            mockEntity.scan.go.mockResolvedValue({ data: [mockCustomer], cursor: null });

            const result = await repo.list();

            expect(result.items).toHaveLength(1);
            expect(result.items[0].customerId).toBe('cust-1');
            expect(result.cursor).toBeNull();
        });

        it('should pass limit and cursor options to scan', async () => {
            mockEntity.scan.go.mockResolvedValue({ data: [mockCustomer], cursor: 'next-page' });

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
        it('should update a customer and return the parsed result', async () => {
            const updatedCustomer = { ...mockCustomer, firstName: 'Jane' };
            mockEntity.patch.mockReturnValue({
                set: vi.fn().mockReturnValue({ go: vi.fn().mockResolvedValue({ data: updatedCustomer }) }),
            });

            const result = await repo.update('cust-1', { firstName: 'Jane' });

            expect(result.firstName).toBe('Jane');
        });

        it('should throw Data integrity error when update returns invalid data', async () => {
            mockEntity.patch.mockReturnValue({
                set: vi.fn().mockReturnValue({ go: vi.fn().mockResolvedValue({ data: { badField: true } }) }),
            });

            await expect(repo.update('cust-1', { firstName: 'Jane' })).rejects.toThrow('Data integrity error');
        });
    });

    describe('delete', () => {
        it('should delete a customer', async () => {
            mockEntity.delete.mockReturnValue({ go: vi.fn().mockResolvedValue({}) });

            await expect(repo.delete('cust-1')).resolves.toBeUndefined();
            expect(mockEntity.delete).toHaveBeenCalledWith({ customerId: 'cust-1' });
        });
    });
});
