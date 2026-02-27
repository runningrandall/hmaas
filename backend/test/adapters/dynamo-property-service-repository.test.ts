import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/observability', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    tracer: { captureAWSv3Client: (c: any) => c },
    metrics: { addMetric: vi.fn() },
}));

vi.mock('../../src/entities/service', () => ({
    DBService: {
        entities: {
            propertyService: {
                create: vi.fn(),
                get: vi.fn(),
                query: {
                    byPropertyId: vi.fn(),
                },
                patch: vi.fn(),
                delete: vi.fn(),
            },
        },
    },
}));

import { DynamoPropertyServiceRepository } from '../../src/adapters/dynamo-property-service-repository';
import { DBService } from '../../src/entities/service';

const mockPropertyService = {
    organizationId: 'org-test-123',
    serviceId: 'svc-1',
    propertyId: 'prop-1',
    serviceTypeId: 'st-1',
    planId: 'plan-1',
    status: 'active' as const,
    startDate: '2024-01-01',
    endDate: null,
    frequency: 'monthly',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
};

describe('DynamoPropertyServiceRepository', () => {
    let repo: DynamoPropertyServiceRepository;
    const mockEntity = (DBService.entities.propertyService as any);

    beforeEach(() => {
        vi.clearAllMocks();
        repo = new DynamoPropertyServiceRepository();
    });

    describe('create', () => {
        it('should create a property service and return the parsed result', async () => {
            mockEntity.create.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: mockPropertyService }) });

            const result = await repo.create(mockPropertyService);

            expect(result.serviceId).toBe('svc-1');
            expect(result.propertyId).toBe('prop-1');
        });

        it('should throw Data integrity error when create returns invalid data', async () => {
            mockEntity.create.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: { serviceId: 'svc-1' } }) });

            await expect(repo.create(mockPropertyService)).rejects.toThrow('Data integrity error');
        });
    });

    describe('get', () => {
        it('should return a parsed property service when found', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: mockPropertyService }) });

            const result = await repo.get('org-test-123', 'svc-1');

            expect(result).not.toBeNull();
            expect(result!.serviceId).toBe('svc-1');
        });

        it('should return null when property service not found', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: null }) });

            const result = await repo.get('org-test-123', 'svc-1');

            expect(result).toBeNull();
        });

        it('should throw Data integrity error when get returns invalid data', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: { badField: true } }) });

            await expect(repo.get('org-test-123', 'svc-1')).rejects.toThrow('Data integrity error');
        });
    });

    describe('listByPropertyId', () => {
        it('should return paginated list of property services for a property', async () => {
            mockEntity.query.byPropertyId.mockReturnValue({
                go: vi.fn().mockResolvedValue({ data: [mockPropertyService], cursor: null }),
            });

            const result = await repo.listByPropertyId('org-test-123', 'prop-1');

            expect(result.items).toHaveLength(1);
            expect(result.items[0].serviceId).toBe('svc-1');
            expect(result.cursor).toBeNull();
        });

        it('should pass limit and cursor options', async () => {
            const mockGo = vi.fn().mockResolvedValue({ data: [mockPropertyService], cursor: 'next-page' });
            mockEntity.query.byPropertyId.mockReturnValue({ go: mockGo });

            const result = await repo.listByPropertyId('org-test-123', 'prop-1', { limit: 5, cursor: 'some-cursor' });

            expect(mockEntity.query.byPropertyId).toHaveBeenCalledWith({ organizationId: 'org-test-123', propertyId: 'prop-1' });
            expect(mockGo).toHaveBeenCalledWith({ limit: 5, cursor: 'some-cursor' });
            expect(result.cursor).toBe('next-page');
        });

        it('should use default page size when no options provided', async () => {
            const mockGo = vi.fn().mockResolvedValue({ data: [], cursor: null });
            mockEntity.query.byPropertyId.mockReturnValue({ go: mockGo });

            await repo.listByPropertyId('org-test-123', 'prop-1');

            expect(mockGo).toHaveBeenCalledWith({ limit: 20 });
        });
    });

    describe('update', () => {
        it('should update a property service and return the parsed result', async () => {
            const updated = { ...mockPropertyService, status: 'inactive' as const };
            mockEntity.patch.mockReturnValue({
                set: vi.fn().mockReturnValue({ go: vi.fn().mockResolvedValue({ data: updated }) }),
            });

            const result = await repo.update('org-test-123', 'svc-1', { status: 'inactive' });

            expect(result.status).toBe('inactive');
        });

        it('should throw Data integrity error when update returns invalid data', async () => {
            mockEntity.patch.mockReturnValue({
                set: vi.fn().mockReturnValue({ go: vi.fn().mockResolvedValue({ data: { badField: true } }) }),
            });

            await expect(repo.update('org-test-123', 'svc-1', { status: 'inactive' })).rejects.toThrow('Data integrity error');
        });
    });

    describe('delete', () => {
        it('should delete a property service', async () => {
            mockEntity.delete.mockReturnValue({ go: vi.fn().mockResolvedValue({}) });

            await expect(repo.delete('org-test-123', 'svc-1')).resolves.toBeUndefined();
            expect(mockEntity.delete).toHaveBeenCalledWith({ organizationId: 'org-test-123', serviceId: 'svc-1' });
        });
    });
});
