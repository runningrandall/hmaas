import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/observability', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    tracer: { captureAWSv3Client: (c: any) => c },
    metrics: { addMetric: vi.fn() },
}));

vi.mock('../../src/entities/service', () => ({
    DBService: {
        entities: {
            delegate: {
                create: vi.fn(),
                get: vi.fn(),
                query: {
                    byAccountId: vi.fn(),
                },
                delete: vi.fn(),
            },
        },
    },
}));

import { DynamoDelegateRepository } from '../../src/adapters/dynamo-delegate-repository';
import { DBService } from '../../src/entities/service';

const mockDelegate = {
    delegateId: 'del-1',
    accountId: 'acct-1',
    email: 'delegate@example.com',
    name: 'Bob Delegate',
    permissions: ['read', 'write'],
    status: 'active' as const,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
};

describe('DynamoDelegateRepository', () => {
    let repo: DynamoDelegateRepository;
    const mockEntity = (DBService.entities.delegate as any);

    beforeEach(() => {
        vi.clearAllMocks();
        repo = new DynamoDelegateRepository();
    });

    describe('create', () => {
        it('should create a delegate and return the parsed result', async () => {
            mockEntity.create.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: mockDelegate }) });

            const result = await repo.create(mockDelegate);

            expect(result.delegateId).toBe('del-1');
            expect(result.name).toBe('Bob Delegate');
        });

        it('should throw Data integrity error when create returns invalid data', async () => {
            mockEntity.create.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: { delegateId: 'del-1' } }) });

            await expect(repo.create(mockDelegate)).rejects.toThrow('Data integrity error');
        });
    });

    describe('get', () => {
        it('should return a parsed delegate when found', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: mockDelegate }) });

            const result = await repo.get('del-1');

            expect(result).not.toBeNull();
            expect(result!.delegateId).toBe('del-1');
        });

        it('should return null when delegate not found', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: null }) });

            const result = await repo.get('del-1');

            expect(result).toBeNull();
        });

        it('should throw Data integrity error when get returns invalid data', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: { badField: true } }) });

            await expect(repo.get('del-1')).rejects.toThrow('Data integrity error');
        });
    });

    describe('listByAccountId', () => {
        it('should return paginated list of delegates for an account', async () => {
            mockEntity.query.byAccountId.mockReturnValue({
                go: vi.fn().mockResolvedValue({ data: [mockDelegate], cursor: null }),
            });

            const result = await repo.listByAccountId('acct-1');

            expect(result.items).toHaveLength(1);
            expect(result.items[0].delegateId).toBe('del-1');
            expect(result.cursor).toBeNull();
        });

        it('should pass limit and cursor options', async () => {
            const mockGo = vi.fn().mockResolvedValue({ data: [mockDelegate], cursor: 'next-page' });
            mockEntity.query.byAccountId.mockReturnValue({ go: mockGo });

            const result = await repo.listByAccountId('acct-1', { limit: 5, cursor: 'some-cursor' });

            expect(mockEntity.query.byAccountId).toHaveBeenCalledWith({ accountId: 'acct-1' });
            expect(mockGo).toHaveBeenCalledWith({ limit: 5, cursor: 'some-cursor' });
            expect(result.cursor).toBe('next-page');
        });

        it('should use default page size when no options provided', async () => {
            const mockGo = vi.fn().mockResolvedValue({ data: [], cursor: null });
            mockEntity.query.byAccountId.mockReturnValue({ go: mockGo });

            await repo.listByAccountId('acct-1');

            expect(mockGo).toHaveBeenCalledWith({ limit: 20 });
        });
    });

    describe('delete', () => {
        it('should delete a delegate', async () => {
            mockEntity.delete.mockReturnValue({ go: vi.fn().mockResolvedValue({}) });

            await expect(repo.delete('del-1')).resolves.toBeUndefined();
            expect(mockEntity.delete).toHaveBeenCalledWith({ delegateId: 'del-1' });
        });
    });
});
