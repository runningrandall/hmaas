import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/observability', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    tracer: { captureAWSv3Client: (c: any) => c },
    metrics: { addMetric: vi.fn() },
}));

vi.mock('../../src/entities/service', () => ({
    DBService: {
        entities: {
            serviceType: {
                create: vi.fn(),
                get: vi.fn(),
                scan: { go: vi.fn() },
                patch: vi.fn(),
                delete: vi.fn(),
            },
        },
    },
}));

import { DynamoServiceTypeRepository } from '../../src/adapters/dynamo-service-type-repository';
import { DBService } from '../../src/entities/service';

const mockServiceType = {
    serviceTypeId: 'st-1',
    name: 'Lawn Mowing',
    description: 'Regular lawn mowing service',
    category: 'lawn',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
};

describe('DynamoServiceTypeRepository', () => {
    let repo: DynamoServiceTypeRepository;
    const mockEntity = (DBService.entities.serviceType as any);

    beforeEach(() => {
        vi.clearAllMocks();
        repo = new DynamoServiceTypeRepository();
    });

    describe('create', () => {
        it('should create a service type and return the parsed result', async () => {
            mockEntity.create.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: mockServiceType }) });

            const result = await repo.create(mockServiceType);

            expect(result.serviceTypeId).toBe('st-1');
            expect(result.name).toBe('Lawn Mowing');
        });

        it('should throw Data integrity error when create returns invalid data', async () => {
            mockEntity.create.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: { serviceTypeId: 'st-1' } }) });

            await expect(repo.create(mockServiceType)).rejects.toThrow('Data integrity error');
        });
    });

    describe('get', () => {
        it('should return a parsed service type when found', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: mockServiceType }) });

            const result = await repo.get('st-1');

            expect(result).not.toBeNull();
            expect(result!.serviceTypeId).toBe('st-1');
        });

        it('should return null when service type not found', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: null }) });

            const result = await repo.get('st-1');

            expect(result).toBeNull();
        });

        it('should throw Data integrity error when get returns invalid data', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: { badField: true } }) });

            await expect(repo.get('st-1')).rejects.toThrow('Data integrity error');
        });
    });

    describe('list', () => {
        it('should return paginated list of service types', async () => {
            mockEntity.scan.go.mockResolvedValue({ data: [mockServiceType], cursor: null });

            const result = await repo.list();

            expect(result.items).toHaveLength(1);
            expect(result.items[0].serviceTypeId).toBe('st-1');
            expect(result.cursor).toBeNull();
        });

        it('should pass limit and cursor options to scan', async () => {
            mockEntity.scan.go.mockResolvedValue({ data: [mockServiceType], cursor: 'next-page' });

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
        it('should update a service type and return the parsed result', async () => {
            const updated = { ...mockServiceType, name: 'Lawn Care' };
            mockEntity.patch.mockReturnValue({
                set: vi.fn().mockReturnValue({ go: vi.fn().mockResolvedValue({ data: updated }) }),
            });

            const result = await repo.update('st-1', { name: 'Lawn Care' });

            expect(result.name).toBe('Lawn Care');
        });

        it('should throw Data integrity error when update returns invalid data', async () => {
            mockEntity.patch.mockReturnValue({
                set: vi.fn().mockReturnValue({ go: vi.fn().mockResolvedValue({ data: { badField: true } }) }),
            });

            await expect(repo.update('st-1', { name: 'Lawn Care' })).rejects.toThrow('Data integrity error');
        });
    });

    describe('delete', () => {
        it('should delete a service type', async () => {
            mockEntity.delete.mockReturnValue({ go: vi.fn().mockResolvedValue({}) });

            await expect(repo.delete('st-1')).resolves.toBeUndefined();
            expect(mockEntity.delete).toHaveBeenCalledWith({ serviceTypeId: 'st-1' });
        });
    });
});
