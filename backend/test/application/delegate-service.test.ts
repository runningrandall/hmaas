import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/observability', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), addContext: vi.fn() },
    tracer: { captureAWSv3Client: (c: any) => c },
    metrics: { addMetric: vi.fn() },
}));

import { DelegateService } from '../../src/application/delegate-service';
import { AppError } from '../../src/lib/error';

const mockRepo = {
    create: vi.fn(),
    get: vi.fn(),
    listByAccountId: vi.fn(),
    delete: vi.fn(),
};

const mockPublisher = { publish: vi.fn() };

const ORG_ID = 'org-test-123';

describe('DelegateService', () => {
    let service: DelegateService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new DelegateService(mockRepo as any, mockPublisher as any);
    });

    describe('createDelegate', () => {
        it('should create delegate with active status, publish DelegateAdded event, and record metric', async () => {
            const request = {
                accountId: 'acct-1',
                email: 'delegate@example.com',
                name: 'Jane Delegate',
                permissions: ['view', 'edit'],
            };

            const created = {
                organizationId: ORG_ID,
                delegateId: 'del-1',
                ...request,
                status: 'active',
                createdAt: '2024-01-01T00:00:00.000Z',
            };

            mockRepo.create.mockResolvedValue(created);
            mockPublisher.publish.mockResolvedValue(undefined);

            const { metrics } = await import('../../src/lib/observability');

            const result = await service.createDelegate(ORG_ID, request as any);

            expect(result).toEqual(created);
            expect(mockRepo.create).toHaveBeenCalledOnce();
            expect(mockPublisher.publish).toHaveBeenCalledWith('DelegateAdded', expect.objectContaining({
                organizationId: ORG_ID,
                delegateId: created.delegateId,
                accountId: request.accountId,
            }));
            expect(metrics.addMetric).toHaveBeenCalledWith('DelegatesCreated', expect.any(String), 1);
        });

        it('should set status to active and populate delegateId and createdAt', async () => {
            const request = {
                accountId: 'acct-2',
                email: 'another@example.com',
                name: 'Bob Delegate',
                permissions: ['view'],
            };

            mockRepo.create.mockImplementation(async (d: any) => d);
            mockPublisher.publish.mockResolvedValue(undefined);

            const result = await service.createDelegate(ORG_ID, request as any);

            expect(result.status).toBe('active');
            expect(result.delegateId).toEqual(expect.any(String));
            expect(result.createdAt).toEqual(expect.any(String));
        });
    });

    describe('getDelegate', () => {
        it('should return delegate when found', async () => {
            const delegate = { organizationId: ORG_ID, delegateId: 'del-1', accountId: 'acct-1', status: 'active' };
            mockRepo.get.mockResolvedValue(delegate);

            const result = await service.getDelegate(ORG_ID, 'del-1');

            expect(result).toEqual(delegate);
            expect(mockRepo.get).toHaveBeenCalledWith(ORG_ID, 'del-1');
        });

        it('should throw AppError 404 when delegate not found', async () => {
            mockRepo.get.mockResolvedValue(null);

            await expect(service.getDelegate(ORG_ID, 'missing')).rejects.toThrow(AppError);
            await expect(service.getDelegate(ORG_ID, 'missing')).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    describe('listDelegatesByAccount', () => {
        it('should delegate to repo.listByAccountId', async () => {
            const paginated = { items: [{ organizationId: ORG_ID, delegateId: 'del-1', accountId: 'acct-1' }], count: 1 };
            mockRepo.listByAccountId.mockResolvedValue(paginated);

            const result = await service.listDelegatesByAccount(ORG_ID, 'acct-1', { limit: 10 });

            expect(result).toEqual(paginated);
            expect(mockRepo.listByAccountId).toHaveBeenCalledWith(ORG_ID, 'acct-1', { limit: 10 });
        });
    });

    describe('deleteDelegate', () => {
        it('should fetch delegate first to get accountId, delete it, and publish DelegateRemoved event', async () => {
            const delegate = { organizationId: ORG_ID, delegateId: 'del-1', accountId: 'acct-1', status: 'active' };
            mockRepo.get.mockResolvedValue(delegate);
            mockRepo.delete.mockResolvedValue(undefined);
            mockPublisher.publish.mockResolvedValue(undefined);

            await service.deleteDelegate(ORG_ID, 'del-1');

            expect(mockRepo.get).toHaveBeenCalledWith(ORG_ID, 'del-1');
            expect(mockRepo.delete).toHaveBeenCalledWith(ORG_ID, 'del-1');
            expect(mockPublisher.publish).toHaveBeenCalledWith('DelegateRemoved', expect.objectContaining({
                organizationId: ORG_ID,
                delegateId: 'del-1',
                accountId: 'acct-1',
            }));
        });

        it('should throw 404 if delegate not found before deleting', async () => {
            mockRepo.get.mockResolvedValue(null);

            await expect(service.deleteDelegate(ORG_ID, 'missing')).rejects.toMatchObject({ statusCode: 404 });
            expect(mockRepo.delete).not.toHaveBeenCalled();
        });
    });
});
