import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/observability', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    tracer: { captureAWSv3Client: (c: any) => c },
    metrics: { addMetric: vi.fn() },
}));

vi.mock('../../src/entities/service', () => ({
    DBService: {
        entities: {
            account: {
                create: vi.fn(),
                get: vi.fn(),
                query: {
                    byCustomerId: vi.fn(),
                },
                patch: vi.fn(),
                delete: vi.fn(),
            },
        },
    },
}));

import { DynamoAccountRepository } from '../../src/adapters/dynamo-account-repository';
import { DBService } from '../../src/entities/service';

const mockAccount = {
    accountId: 'acct-1',
    customerId: 'cust-1',
    cognitoUserId: 'cognito-123',
    planId: 'plan-1',
    status: 'active' as const,
    billingEmail: 'billing@example.com',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
};

describe('DynamoAccountRepository', () => {
    let repo: DynamoAccountRepository;
    const mockEntity = (DBService.entities.account as any);

    beforeEach(() => {
        vi.clearAllMocks();
        repo = new DynamoAccountRepository();
    });

    describe('create', () => {
        it('should create an account and return the parsed result', async () => {
            mockEntity.create.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: mockAccount }) });

            const result = await repo.create(mockAccount);

            expect(mockEntity.create).toHaveBeenCalled();
            expect(result.accountId).toBe('acct-1');
            expect(result.customerId).toBe('cust-1');
        });

        it('should throw Data integrity error when create returns invalid data', async () => {
            mockEntity.create.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: { accountId: 'acct-1' } }) });

            await expect(repo.create(mockAccount)).rejects.toThrow('Data integrity error');
        });
    });

    describe('get', () => {
        it('should return a parsed account when found', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: mockAccount }) });

            const result = await repo.get('acct-1');

            expect(result).not.toBeNull();
            expect(result!.accountId).toBe('acct-1');
        });

        it('should return null when account not found', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: null }) });

            const result = await repo.get('acct-1');

            expect(result).toBeNull();
        });

        it('should throw Data integrity error when get returns invalid data', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: { badField: true } }) });

            await expect(repo.get('acct-1')).rejects.toThrow('Data integrity error');
        });
    });

    describe('getByCustomerId', () => {
        it('should return the first account matching the customerId', async () => {
            mockEntity.query.byCustomerId.mockReturnValue({
                go: vi.fn().mockResolvedValue({ data: [mockAccount], cursor: null }),
            });

            const result = await repo.getByCustomerId('cust-1');

            expect(result).not.toBeNull();
            expect(result!.customerId).toBe('cust-1');
        });

        it('should return null when no accounts found for customerId', async () => {
            mockEntity.query.byCustomerId.mockReturnValue({
                go: vi.fn().mockResolvedValue({ data: [], cursor: null }),
            });

            const result = await repo.getByCustomerId('cust-1');

            expect(result).toBeNull();
        });

        it('should return null when data is null', async () => {
            mockEntity.query.byCustomerId.mockReturnValue({
                go: vi.fn().mockResolvedValue({ data: null, cursor: null }),
            });

            const result = await repo.getByCustomerId('cust-1');

            expect(result).toBeNull();
        });

        it('should throw Data integrity error when returned account data is invalid', async () => {
            mockEntity.query.byCustomerId.mockReturnValue({
                go: vi.fn().mockResolvedValue({ data: [{ badField: true }], cursor: null }),
            });

            await expect(repo.getByCustomerId('cust-1')).rejects.toThrow('Data integrity error');
        });
    });

    describe('update', () => {
        it('should update an account and return the parsed result', async () => {
            const updatedAccount = { ...mockAccount, planId: 'plan-2' };
            mockEntity.patch.mockReturnValue({
                set: vi.fn().mockReturnValue({ go: vi.fn().mockResolvedValue({ data: updatedAccount }) }),
            });

            const result = await repo.update('acct-1', { planId: 'plan-2' });

            expect(result.planId).toBe('plan-2');
        });

        it('should throw Data integrity error when update returns invalid data', async () => {
            mockEntity.patch.mockReturnValue({
                set: vi.fn().mockReturnValue({ go: vi.fn().mockResolvedValue({ data: { badField: true } }) }),
            });

            await expect(repo.update('acct-1', { planId: 'plan-2' })).rejects.toThrow('Data integrity error');
        });
    });

    describe('delete', () => {
        it('should delete an account', async () => {
            mockEntity.delete.mockReturnValue({ go: vi.fn().mockResolvedValue({}) });

            await expect(repo.delete('acct-1')).resolves.toBeUndefined();
            expect(mockEntity.delete).toHaveBeenCalledWith({ accountId: 'acct-1' });
        });
    });
});
