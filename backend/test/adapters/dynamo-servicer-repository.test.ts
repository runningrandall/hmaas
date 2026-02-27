import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/observability', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    tracer: { captureAWSv3Client: (c: any) => c },
    metrics: { addMetric: vi.fn() },
}));

vi.mock('../../src/entities/service', () => ({
    DBService: {
        entities: {
            servicer: {
                create: vi.fn(),
                get: vi.fn(),
                query: {
                    byEmployeeId: vi.fn(),
                },
                patch: vi.fn(),
                delete: vi.fn(),
            },
        },
    },
}));

import { DynamoServicerRepository } from '../../src/adapters/dynamo-servicer-repository';
import { DBService } from '../../src/entities/service';

const mockServicer = {
    organizationId: 'org-test-123',
    servicerId: 'sr-1',
    employeeId: 'emp-1',
    serviceArea: 'North Zone',
    maxDailyJobs: 8,
    rating: 4.5,
    status: 'active' as const,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
};

describe('DynamoServicerRepository', () => {
    let repo: DynamoServicerRepository;
    const mockEntity = (DBService.entities.servicer as any);

    beforeEach(() => {
        vi.clearAllMocks();
        repo = new DynamoServicerRepository();
    });

    describe('create', () => {
        it('should create a servicer and return the parsed result', async () => {
            mockEntity.create.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: mockServicer }) });

            const result = await repo.create(mockServicer);

            expect(result.servicerId).toBe('sr-1');
            expect(result.employeeId).toBe('emp-1');
        });

        it('should throw Data integrity error when create returns invalid data', async () => {
            mockEntity.create.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: { servicerId: 'sr-1' } }) });

            await expect(repo.create(mockServicer)).rejects.toThrow('Data integrity error');
        });
    });

    describe('get', () => {
        it('should return a parsed servicer when found', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: mockServicer }) });

            const result = await repo.get('org-test-123', 'sr-1');

            expect(result).not.toBeNull();
            expect(result!.servicerId).toBe('sr-1');
        });

        it('should return null when servicer not found', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: null }) });

            const result = await repo.get('org-test-123', 'sr-1');

            expect(result).toBeNull();
        });

        it('should throw Data integrity error when get returns invalid data', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: { badField: true } }) });

            await expect(repo.get('org-test-123', 'sr-1')).rejects.toThrow('Data integrity error');
        });
    });

    describe('getByEmployeeId', () => {
        it('should return paginated list of servicers for an employee', async () => {
            mockEntity.query.byEmployeeId.mockReturnValue({
                go: vi.fn().mockResolvedValue({ data: [mockServicer], cursor: null }),
            });

            const result = await repo.getByEmployeeId('org-test-123', 'emp-1');

            expect(result.items).toHaveLength(1);
            expect(result.items[0].servicerId).toBe('sr-1');
            expect(result.cursor).toBeNull();
        });

        it('should pass limit and cursor options', async () => {
            const mockGo = vi.fn().mockResolvedValue({ data: [mockServicer], cursor: 'next-page' });
            mockEntity.query.byEmployeeId.mockReturnValue({ go: mockGo });

            const result = await repo.getByEmployeeId('org-test-123', 'emp-1', { limit: 5, cursor: 'some-cursor' });

            expect(mockEntity.query.byEmployeeId).toHaveBeenCalledWith({ organizationId: 'org-test-123', employeeId: 'emp-1' });
            expect(mockGo).toHaveBeenCalledWith({ limit: 5, cursor: 'some-cursor' });
            expect(result.cursor).toBe('next-page');
        });

        it('should use default page size when no options provided', async () => {
            const mockGo = vi.fn().mockResolvedValue({ data: [], cursor: null });
            mockEntity.query.byEmployeeId.mockReturnValue({ go: mockGo });

            await repo.getByEmployeeId('org-test-123', 'emp-1');

            expect(mockGo).toHaveBeenCalledWith({ limit: 20 });
        });
    });

    describe('update', () => {
        it('should update a servicer and return the parsed result', async () => {
            const updated = { ...mockServicer, maxDailyJobs: 10 };
            mockEntity.patch.mockReturnValue({
                set: vi.fn().mockReturnValue({ go: vi.fn().mockResolvedValue({ data: updated }) }),
            });

            const result = await repo.update('org-test-123', 'sr-1', { maxDailyJobs: 10 });

            expect(result.maxDailyJobs).toBe(10);
        });

        it('should throw Data integrity error when update returns invalid data', async () => {
            mockEntity.patch.mockReturnValue({
                set: vi.fn().mockReturnValue({ go: vi.fn().mockResolvedValue({ data: { badField: true } }) }),
            });

            await expect(repo.update('org-test-123', 'sr-1', { maxDailyJobs: 10 })).rejects.toThrow('Data integrity error');
        });
    });

    describe('delete', () => {
        it('should delete a servicer', async () => {
            mockEntity.delete.mockReturnValue({ go: vi.fn().mockResolvedValue({}) });

            await expect(repo.delete('org-test-123', 'sr-1')).resolves.toBeUndefined();
            expect(mockEntity.delete).toHaveBeenCalledWith({ organizationId: 'org-test-123', servicerId: 'sr-1' });
        });
    });
});
