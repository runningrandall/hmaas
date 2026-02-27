import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/observability', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    tracer: { captureAWSv3Client: (c: any) => c },
    metrics: { addMetric: vi.fn() },
}));

vi.mock('../../src/entities/service', () => ({
    DBService: {
        entities: {
            capability: {
                create: vi.fn(),
                get: vi.fn(),
                query: {
                    byEmployeeId: vi.fn(),
                },
                delete: vi.fn(),
            },
        },
    },
}));

import { DynamoCapabilityRepository } from '../../src/adapters/dynamo-capability-repository';
import { DBService } from '../../src/entities/service';

const mockCapability = {
    capabilityId: 'cap-1',
    employeeId: 'emp-1',
    serviceTypeId: 'st-1',
    level: 'expert' as const,
    certificationDate: '2023-06-01',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
};

describe('DynamoCapabilityRepository', () => {
    let repo: DynamoCapabilityRepository;
    const mockEntity = (DBService.entities.capability as any);

    beforeEach(() => {
        vi.clearAllMocks();
        repo = new DynamoCapabilityRepository();
    });

    describe('create', () => {
        it('should create a capability and return the parsed result', async () => {
            mockEntity.create.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: mockCapability }) });

            const result = await repo.create(mockCapability);

            expect(result.capabilityId).toBe('cap-1');
            expect(result.level).toBe('expert');
        });

        it('should throw Data integrity error when create returns invalid data', async () => {
            mockEntity.create.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: { capabilityId: 'cap-1' } }) });

            await expect(repo.create(mockCapability)).rejects.toThrow('Data integrity error');
        });
    });

    describe('get', () => {
        it('should return a parsed capability when found', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: mockCapability }) });

            const result = await repo.get('cap-1');

            expect(result).not.toBeNull();
            expect(result!.capabilityId).toBe('cap-1');
        });

        it('should return null when capability not found', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: null }) });

            const result = await repo.get('cap-1');

            expect(result).toBeNull();
        });

        it('should throw Data integrity error when get returns invalid data', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: { badField: true } }) });

            await expect(repo.get('cap-1')).rejects.toThrow('Data integrity error');
        });
    });

    describe('listByEmployeeId', () => {
        it('should return paginated list of capabilities for an employee', async () => {
            mockEntity.query.byEmployeeId.mockReturnValue({
                go: vi.fn().mockResolvedValue({ data: [mockCapability], cursor: null }),
            });

            const result = await repo.listByEmployeeId('emp-1');

            expect(result.items).toHaveLength(1);
            expect(result.items[0].capabilityId).toBe('cap-1');
            expect(result.cursor).toBeNull();
        });

        it('should pass limit and cursor options', async () => {
            const mockGo = vi.fn().mockResolvedValue({ data: [mockCapability], cursor: 'next-page' });
            mockEntity.query.byEmployeeId.mockReturnValue({ go: mockGo });

            const result = await repo.listByEmployeeId('emp-1', { limit: 5, cursor: 'some-cursor' });

            expect(mockEntity.query.byEmployeeId).toHaveBeenCalledWith({ employeeId: 'emp-1' });
            expect(mockGo).toHaveBeenCalledWith({ limit: 5, cursor: 'some-cursor' });
            expect(result.cursor).toBe('next-page');
        });

        it('should use default page size when no options provided', async () => {
            const mockGo = vi.fn().mockResolvedValue({ data: [], cursor: null });
            mockEntity.query.byEmployeeId.mockReturnValue({ go: mockGo });

            await repo.listByEmployeeId('emp-1');

            expect(mockGo).toHaveBeenCalledWith({ limit: 20 });
        });
    });

    describe('delete', () => {
        it('should delete a capability', async () => {
            mockEntity.delete.mockReturnValue({ go: vi.fn().mockResolvedValue({}) });

            await expect(repo.delete('cap-1')).resolves.toBeUndefined();
            expect(mockEntity.delete).toHaveBeenCalledWith({ capabilityId: 'cap-1' });
        });
    });
});
