import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/observability', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    tracer: { captureAWSv3Client: (c: any) => c },
    metrics: { addMetric: vi.fn() },
}));

vi.mock('../../src/entities/service', () => ({
    DBService: {
        entities: {
            property: {
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

import { DynamoPropertyRepository } from '../../src/adapters/dynamo-property-repository';
import { DBService } from '../../src/entities/service';

const mockProperty = {
    propertyId: 'prop-1',
    customerId: 'cust-1',
    propertyTypeId: 'pt-1',
    name: 'My Home',
    address: '123 Main St',
    city: 'Springfield',
    state: 'IL',
    zip: '62701',
    lat: 39.7817,
    lng: -89.6501,
    lotSize: 5000,
    notes: null,
    status: 'active' as const,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
};

describe('DynamoPropertyRepository', () => {
    let repo: DynamoPropertyRepository;
    const mockEntity = (DBService.entities.property as any);

    beforeEach(() => {
        vi.clearAllMocks();
        repo = new DynamoPropertyRepository();
    });

    describe('create', () => {
        it('should create a property and return the parsed result', async () => {
            mockEntity.create.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: mockProperty }) });

            const result = await repo.create(mockProperty);

            expect(result.propertyId).toBe('prop-1');
            expect(result.name).toBe('My Home');
        });

        it('should throw Data integrity error when create returns invalid data', async () => {
            mockEntity.create.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: { propertyId: 'prop-1' } }) });

            await expect(repo.create(mockProperty)).rejects.toThrow('Data integrity error');
        });
    });

    describe('get', () => {
        it('should return a parsed property when found', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: mockProperty }) });

            const result = await repo.get('prop-1');

            expect(result).not.toBeNull();
            expect(result!.propertyId).toBe('prop-1');
        });

        it('should return null when property not found', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: null }) });

            const result = await repo.get('prop-1');

            expect(result).toBeNull();
        });

        it('should throw Data integrity error when get returns invalid data', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: { badField: true } }) });

            await expect(repo.get('prop-1')).rejects.toThrow('Data integrity error');
        });
    });

    describe('listByCustomerId', () => {
        it('should return paginated list of properties for a customer', async () => {
            mockEntity.query.byCustomerId.mockReturnValue({
                go: vi.fn().mockResolvedValue({ data: [mockProperty], cursor: null }),
            });

            const result = await repo.listByCustomerId('cust-1');

            expect(result.items).toHaveLength(1);
            expect(result.items[0].propertyId).toBe('prop-1');
            expect(result.cursor).toBeNull();
        });

        it('should pass limit and cursor options', async () => {
            mockEntity.query.byCustomerId.mockReturnValue({
                go: vi.fn().mockResolvedValue({ data: [mockProperty], cursor: 'next-page' }),
            });

            const result = await repo.listByCustomerId('cust-1', { limit: 5, cursor: 'some-cursor' });

            expect(mockEntity.query.byCustomerId).toHaveBeenCalledWith({ customerId: 'cust-1' });
            expect(result.cursor).toBe('next-page');
        });

        it('should use default page size when no options provided', async () => {
            const mockGo = vi.fn().mockResolvedValue({ data: [], cursor: null });
            mockEntity.query.byCustomerId.mockReturnValue({ go: mockGo });

            await repo.listByCustomerId('cust-1');

            expect(mockGo).toHaveBeenCalledWith({ limit: 20 });
        });
    });

    describe('update', () => {
        it('should update a property and return the parsed result', async () => {
            const updatedProperty = { ...mockProperty, name: 'Updated Home' };
            mockEntity.patch.mockReturnValue({
                set: vi.fn().mockReturnValue({ go: vi.fn().mockResolvedValue({ data: updatedProperty }) }),
            });

            const result = await repo.update('prop-1', { name: 'Updated Home' });

            expect(result.name).toBe('Updated Home');
        });

        it('should throw Data integrity error when update returns invalid data', async () => {
            mockEntity.patch.mockReturnValue({
                set: vi.fn().mockReturnValue({ go: vi.fn().mockResolvedValue({ data: { badField: true } }) }),
            });

            await expect(repo.update('prop-1', { name: 'Updated Home' })).rejects.toThrow('Data integrity error');
        });
    });

    describe('delete', () => {
        it('should delete a property', async () => {
            mockEntity.delete.mockReturnValue({ go: vi.fn().mockResolvedValue({}) });

            await expect(repo.delete('prop-1')).resolves.toBeUndefined();
            expect(mockEntity.delete).toHaveBeenCalledWith({ propertyId: 'prop-1' });
        });
    });
});
