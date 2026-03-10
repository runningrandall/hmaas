import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/observability', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    tracer: { captureAWSv3Client: (c: any) => c },
    metrics: { addMetric: vi.fn() },
}));

vi.mock('../../src/entities/service', () => ({
    DBService: {
        entities: {
            subcontractorRate: {
                create: vi.fn(),
                get: vi.fn(),
                query: {
                    bySubcontractorId: vi.fn(),
                },
                patch: vi.fn(),
                delete: vi.fn(),
            },
        },
    },
}));

import { DynamoSubcontractorRateRepository } from '../../src/adapters/dynamo-subcontractor-rate-repository';
import { DBService } from '../../src/entities/service';

const mockRate = {
    organizationId: 'org-test-123',
    subcontractorRateId: 'rate-1',
    subcontractorId: 'sub-1',
    propertyId: 'prop-1',
    serviceTypeId: 'svc-type-1',
    rate: 7500,
    unit: 'per_visit',
    effectiveDate: '2026-04-01',
    notes: 'Negotiated rate',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
};

describe('DynamoSubcontractorRateRepository', () => {
    let repo: DynamoSubcontractorRateRepository;
    const mockEntity = (DBService.entities.subcontractorRate as any);

    beforeEach(() => {
        vi.clearAllMocks();
        repo = new DynamoSubcontractorRateRepository();
    });

    describe('create', () => {
        it('should create a rate and return the parsed result', async () => {
            mockEntity.create.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: mockRate }) });

            const result = await repo.create(mockRate);

            expect(result.subcontractorRateId).toBe('rate-1');
            expect(result.rate).toBe(7500);
        });

        it('should throw Data integrity error when create returns invalid data', async () => {
            mockEntity.create.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: { subcontractorRateId: 'rate-1' } }) });

            await expect(repo.create(mockRate)).rejects.toThrow('Data integrity error');
        });
    });

    describe('get', () => {
        it('should return a parsed rate when found', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: mockRate }) });

            const result = await repo.get('org-test-123', 'rate-1');

            expect(result).not.toBeNull();
            expect(result!.subcontractorRateId).toBe('rate-1');
        });

        it('should return null when rate not found', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: null }) });

            const result = await repo.get('org-test-123', 'rate-1');

            expect(result).toBeNull();
        });

        it('should throw Data integrity error when get returns invalid data', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: { badField: true } }) });

            await expect(repo.get('org-test-123', 'rate-1')).rejects.toThrow('Data integrity error');
        });
    });

    describe('listBySubcontractorId', () => {
        it('should return paginated list of rates for a subcontractor', async () => {
            mockEntity.query.bySubcontractorId.mockReturnValue({
                go: vi.fn().mockResolvedValue({ data: [mockRate], cursor: null }),
            });

            const result = await repo.listBySubcontractorId('org-test-123', 'sub-1');

            expect(result.items).toHaveLength(1);
            expect(result.items[0].subcontractorRateId).toBe('rate-1');
            expect(result.cursor).toBeNull();
        });

        it('should pass limit and cursor options', async () => {
            const mockGo = vi.fn().mockResolvedValue({ data: [mockRate], cursor: 'next-page' });
            mockEntity.query.bySubcontractorId.mockReturnValue({ go: mockGo });

            const result = await repo.listBySubcontractorId('org-test-123', 'sub-1', { limit: 5, cursor: 'some-cursor' });

            expect(mockEntity.query.bySubcontractorId).toHaveBeenCalledWith({ organizationId: 'org-test-123', subcontractorId: 'sub-1' });
            expect(mockGo).toHaveBeenCalledWith({ limit: 5, cursor: 'some-cursor' });
            expect(result.cursor).toBe('next-page');
        });

        it('should use default page size when no options provided', async () => {
            const mockGo = vi.fn().mockResolvedValue({ data: [], cursor: null });
            mockEntity.query.bySubcontractorId.mockReturnValue({ go: mockGo });

            await repo.listBySubcontractorId('org-test-123', 'sub-1');

            expect(mockGo).toHaveBeenCalledWith({ limit: 20 });
        });
    });

    describe('update', () => {
        it('should update a rate and return the parsed result', async () => {
            const updated = { ...mockRate, rate: 8000 };
            mockEntity.patch.mockReturnValue({
                set: vi.fn().mockReturnValue({ go: vi.fn().mockResolvedValue({ data: updated }) }),
            });

            const result = await repo.update('org-test-123', 'rate-1', { rate: 8000 });

            expect(result.rate).toBe(8000);
        });

        it('should throw Data integrity error when update returns invalid data', async () => {
            mockEntity.patch.mockReturnValue({
                set: vi.fn().mockReturnValue({ go: vi.fn().mockResolvedValue({ data: { badField: true } }) }),
            });

            await expect(repo.update('org-test-123', 'rate-1', { rate: 8000 })).rejects.toThrow('Data integrity error');
        });
    });

    describe('delete', () => {
        it('should delete a rate', async () => {
            mockEntity.delete.mockReturnValue({ go: vi.fn().mockResolvedValue({}) });

            await expect(repo.delete('org-test-123', 'rate-1')).resolves.toBeUndefined();
            expect(mockEntity.delete).toHaveBeenCalledWith({ organizationId: 'org-test-123', subcontractorRateId: 'rate-1' });
        });
    });
});
