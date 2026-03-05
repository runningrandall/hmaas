import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/observability', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    tracer: { captureAWSv3Client: (c: any) => c },
    metrics: { addMetric: vi.fn() },
}));

vi.mock('../../src/entities/service', () => ({
    DBService: {
        entities: {
            estimate: {
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

import { DynamoEstimateRepository } from '../../src/adapters/dynamo-estimate-repository';
import { DBService } from '../../src/entities/service';

const mockEstimate = {
    organizationId: 'org-test-123',
    estimateId: 'est-1',
    customerId: 'cust-1',
    propertyId: 'prop-1',
    estimateNumber: 'EST-1234567890',
    estimateDate: '2026-03-04',
    expirationDate: '2026-04-04',
    status: 'draft' as const,
    subtotal: 25000,
    tax: 0,
    total: 25000,
    lineItems: [
        {
            serviceTypeId: 'st-1',
            description: 'Lawn Mowing - 5000 sq ft',
            quantity: 5000,
            unit: 'sq ft',
            unitPrice: 5,
            total: 25000,
            estimatedDuration: 60,
        },
    ],
    notes: 'Spring estimate',
    createdAt: '2026-03-04T00:00:00.000Z',
    updatedAt: '2026-03-04T00:00:00.000Z',
};

describe('DynamoEstimateRepository', () => {
    let repo: DynamoEstimateRepository;
    const mockEntity = (DBService.entities.estimate as any);

    beforeEach(() => {
        vi.clearAllMocks();
        repo = new DynamoEstimateRepository();
    });

    describe('create', () => {
        it('should create an estimate and return the parsed result', async () => {
            mockEntity.create.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: mockEstimate }) });

            const result = await repo.create(mockEstimate);

            expect(result.estimateId).toBe('est-1');
            expect(result.customerId).toBe('cust-1');
            expect(result.lineItems).toHaveLength(1);
            expect(result.lineItems[0].serviceTypeId).toBe('st-1');
        });

        it('should throw Data integrity error when create returns invalid data', async () => {
            mockEntity.create.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: { estimateId: 'est-1' } }) });

            await expect(repo.create(mockEstimate)).rejects.toThrow('Data integrity error');
        });
    });

    describe('get', () => {
        it('should return a parsed estimate when found', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: mockEstimate }) });

            const result = await repo.get('org-test-123', 'est-1');

            expect(result).not.toBeNull();
            expect(result!.estimateId).toBe('est-1');
            expect(result!.status).toBe('draft');
        });

        it('should return null when estimate not found', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: null }) });

            const result = await repo.get('org-test-123', 'est-1');

            expect(result).toBeNull();
        });

        it('should throw Data integrity error when get returns invalid data', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: { badField: true } }) });

            await expect(repo.get('org-test-123', 'est-1')).rejects.toThrow('Data integrity error');
        });
    });

    describe('listByCustomerId', () => {
        it('should return paginated list of estimates for a customer', async () => {
            mockEntity.query.byCustomerId.mockReturnValue({
                go: vi.fn().mockResolvedValue({ data: [mockEstimate], cursor: null }),
            });

            const result = await repo.listByCustomerId('org-test-123', 'cust-1');

            expect(result.items).toHaveLength(1);
            expect(result.items[0].estimateId).toBe('est-1');
            expect(result.cursor).toBeNull();
        });

        it('should pass limit and cursor options', async () => {
            const mockGo = vi.fn().mockResolvedValue({ data: [mockEstimate], cursor: 'next-page' });
            mockEntity.query.byCustomerId.mockReturnValue({ go: mockGo });

            const result = await repo.listByCustomerId('org-test-123', 'cust-1', { limit: 5, cursor: 'some-cursor' });

            expect(mockEntity.query.byCustomerId).toHaveBeenCalledWith({ organizationId: 'org-test-123', customerId: 'cust-1' });
            expect(mockGo).toHaveBeenCalledWith({ limit: 5, cursor: 'some-cursor' });
            expect(result.cursor).toBe('next-page');
        });

        it('should use default page size when no options provided', async () => {
            const mockGo = vi.fn().mockResolvedValue({ data: [], cursor: null });
            mockEntity.query.byCustomerId.mockReturnValue({ go: mockGo });

            await repo.listByCustomerId('org-test-123', 'cust-1');

            expect(mockGo).toHaveBeenCalledWith({ limit: 20 });
        });
    });

    describe('update', () => {
        it('should update an estimate and return the parsed result', async () => {
            const updatedEstimate = { ...mockEstimate, status: 'sent' };
            mockEntity.patch.mockReturnValue({
                set: vi.fn().mockReturnValue({ go: vi.fn().mockResolvedValue({ data: updatedEstimate }) }),
            });

            const result = await repo.update('org-test-123', 'est-1', { status: 'sent' });

            expect(result.status).toBe('sent');
        });

        it('should throw Data integrity error when update returns invalid data', async () => {
            mockEntity.patch.mockReturnValue({
                set: vi.fn().mockReturnValue({ go: vi.fn().mockResolvedValue({ data: { badField: true } }) }),
            });

            await expect(repo.update('org-test-123', 'est-1', { status: 'sent' })).rejects.toThrow('Data integrity error');
        });
    });

    describe('delete', () => {
        it('should delete an estimate', async () => {
            mockEntity.delete.mockReturnValue({ go: vi.fn().mockResolvedValue({}) });

            await expect(repo.delete('org-test-123', 'est-1')).resolves.toBeUndefined();
            expect(mockEntity.delete).toHaveBeenCalledWith({ organizationId: 'org-test-123', estimateId: 'est-1' });
        });
    });
});
