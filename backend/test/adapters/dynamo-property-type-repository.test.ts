import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/observability', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    tracer: { captureAWSv3Client: (c: any) => c },
    metrics: { addMetric: vi.fn() },
}));

vi.mock('../../src/entities/service', () => ({
    DBService: {
        entities: {
            propertyType: {
                create: vi.fn(),
                get: vi.fn(),
                query: {
                    byPropertyTypeId: vi.fn(),
                },
                patch: vi.fn(),
                delete: vi.fn(),
            },
        },
    },
}));

import { DynamoPropertyTypeRepository } from '../../src/adapters/dynamo-property-type-repository';
import { DBService } from '../../src/entities/service';

const mockPropertyType = {
    organizationId: 'org-test-123',
    propertyTypeId: 'pt-1',
    name: 'Residential',
    description: 'Single family home',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
};

describe('DynamoPropertyTypeRepository', () => {
    let repo: DynamoPropertyTypeRepository;
    const mockEntity = (DBService.entities.propertyType as any);

    beforeEach(() => {
        vi.clearAllMocks();
        repo = new DynamoPropertyTypeRepository();
    });

    describe('create', () => {
        it('should create a property type and return the parsed result', async () => {
            mockEntity.create.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: mockPropertyType }) });

            const result = await repo.create(mockPropertyType);

            expect(result.propertyTypeId).toBe('pt-1');
            expect(result.name).toBe('Residential');
        });

        it('should throw Data integrity error when create returns invalid data', async () => {
            mockEntity.create.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: { propertyTypeId: 'pt-1' } }) });

            await expect(repo.create(mockPropertyType)).rejects.toThrow('Data integrity error');
        });
    });

    describe('get', () => {
        it('should return a parsed property type when found', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: mockPropertyType }) });

            const result = await repo.get('org-test-123', 'pt-1');

            expect(result).not.toBeNull();
            expect(result!.propertyTypeId).toBe('pt-1');
        });

        it('should return null when property type not found', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: null }) });

            const result = await repo.get('org-test-123', 'pt-1');

            expect(result).toBeNull();
        });

        it('should throw Data integrity error when get returns invalid data', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: { badField: true } }) });

            await expect(repo.get('org-test-123', 'pt-1')).rejects.toThrow('Data integrity error');
        });
    });

    describe('list', () => {
        it('should return paginated list of property types', async () => {
            mockEntity.query.byPropertyTypeId.mockReturnValue({
                go: vi.fn().mockResolvedValue({ data: [mockPropertyType], cursor: null }),
            });

            const result = await repo.list('org-test-123');

            expect(result.items).toHaveLength(1);
            expect(result.items[0].propertyTypeId).toBe('pt-1');
            expect(result.cursor).toBeNull();
        });

        it('should pass limit and cursor options', async () => {
            const mockGo = vi.fn().mockResolvedValue({ data: [mockPropertyType], cursor: 'next-page' });
            mockEntity.query.byPropertyTypeId.mockReturnValue({ go: mockGo });

            const result = await repo.list('org-test-123', { limit: 5, cursor: 'some-cursor' });

            expect(mockEntity.query.byPropertyTypeId).toHaveBeenCalledWith({ organizationId: 'org-test-123' });
            expect(mockGo).toHaveBeenCalledWith({ limit: 5, cursor: 'some-cursor' });
            expect(result.cursor).toBe('next-page');
        });

        it('should use default page size when no options provided', async () => {
            const mockGo = vi.fn().mockResolvedValue({ data: [], cursor: null });
            mockEntity.query.byPropertyTypeId.mockReturnValue({ go: mockGo });

            await repo.list('org-test-123');

            expect(mockGo).toHaveBeenCalledWith({ limit: 20 });
        });
    });

    describe('update', () => {
        it('should update a property type and return the parsed result', async () => {
            const updated = { ...mockPropertyType, name: 'Commercial' };
            mockEntity.patch.mockReturnValue({
                set: vi.fn().mockReturnValue({ go: vi.fn().mockResolvedValue({ data: updated }) }),
            });

            const result = await repo.update('org-test-123', 'pt-1', { name: 'Commercial' });

            expect(result.name).toBe('Commercial');
        });

        it('should throw Data integrity error when update returns invalid data', async () => {
            mockEntity.patch.mockReturnValue({
                set: vi.fn().mockReturnValue({ go: vi.fn().mockResolvedValue({ data: { badField: true } }) }),
            });

            await expect(repo.update('org-test-123', 'pt-1', { name: 'Commercial' })).rejects.toThrow('Data integrity error');
        });
    });

    describe('delete', () => {
        it('should delete a property type', async () => {
            mockEntity.delete.mockReturnValue({ go: vi.fn().mockResolvedValue({}) });

            await expect(repo.delete('org-test-123', 'pt-1')).resolves.toBeUndefined();
            expect(mockEntity.delete).toHaveBeenCalledWith({ organizationId: 'org-test-123', propertyTypeId: 'pt-1' });
        });
    });
});
