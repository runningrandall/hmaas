import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/observability', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), addContext: vi.fn() },
    tracer: { captureAWSv3Client: (c: any) => c },
    metrics: { addMetric: vi.fn() },
}));

import { PropertyTypeService } from '../../src/application/property-type-service';
import { AppError } from '../../src/lib/error';

const mockRepo = {
    create: vi.fn(),
    get: vi.fn(),
    list: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
};

const mockPublisher = { publish: vi.fn() };

const ORG_ID = 'org-test-123';

describe('PropertyTypeService', () => {
    let service: PropertyTypeService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new PropertyTypeService(mockRepo as any, mockPublisher as any);
    });

    describe('createPropertyType', () => {
        it('should create property type, record metric, and return created without publishing event', async () => {
            const request = {
                name: 'Single Family',
                description: 'A single family residential home',
            };

            const created = {
                organizationId: ORG_ID,
                propertyTypeId: 'pt-1',
                ...request,
                createdAt: '2024-01-01T00:00:00.000Z',
            };

            mockRepo.create.mockResolvedValue(created);

            const { metrics } = await import('../../src/lib/observability');

            const result = await service.createPropertyType(ORG_ID, request);

            expect(result).toEqual(created);
            expect(mockRepo.create).toHaveBeenCalledOnce();
            expect(metrics.addMetric).toHaveBeenCalledWith('PropertyTypesCreated', expect.any(String), 1);
            expect(mockPublisher.publish).not.toHaveBeenCalled();
        });

        it('should populate propertyTypeId and createdAt', async () => {
            const request = {
                name: 'Commercial',
                description: 'Commercial property',
            };

            mockRepo.create.mockImplementation(async (pt: any) => pt);

            const result = await service.createPropertyType(ORG_ID, request);

            expect(result.propertyTypeId).toEqual(expect.any(String));
            expect(result.createdAt).toEqual(expect.any(String));
        });
    });

    describe('getPropertyType', () => {
        it('should return property type when found', async () => {
            const propertyType = { organizationId: ORG_ID, propertyTypeId: 'pt-1', name: 'Single Family', description: 'A single family home' };
            mockRepo.get.mockResolvedValue(propertyType);

            const result = await service.getPropertyType(ORG_ID, 'pt-1');

            expect(result).toEqual(propertyType);
            expect(mockRepo.get).toHaveBeenCalledWith(ORG_ID, 'pt-1');
        });

        it('should throw AppError 404 when property type not found', async () => {
            mockRepo.get.mockResolvedValue(null);

            await expect(service.getPropertyType(ORG_ID, 'missing')).rejects.toThrow(AppError);
            await expect(service.getPropertyType(ORG_ID, 'missing')).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    describe('listPropertyTypes', () => {
        it('should delegate to repo.list', async () => {
            const paginated = { items: [{ organizationId: ORG_ID, propertyTypeId: 'pt-1' }], count: 1 };
            mockRepo.list.mockResolvedValue(paginated);

            const result = await service.listPropertyTypes(ORG_ID, { limit: 10 });

            expect(result).toEqual(paginated);
            expect(mockRepo.list).toHaveBeenCalledWith(ORG_ID, { limit: 10 });
        });
    });

    describe('updatePropertyType', () => {
        it('should update property type and return updated without publishing event', async () => {
            const existing = { organizationId: ORG_ID, propertyTypeId: 'pt-1', name: 'Single Family', description: 'Old description' };
            const updated = { organizationId: ORG_ID, propertyTypeId: 'pt-1', name: 'Single Family Updated', description: 'New description' };
            mockRepo.get.mockResolvedValue(existing);
            mockRepo.update.mockResolvedValue(updated);

            const result = await service.updatePropertyType(ORG_ID, 'pt-1', { name: 'Single Family Updated', description: 'New description' });

            expect(result).toEqual(updated);
            expect(mockPublisher.publish).not.toHaveBeenCalled();
        });

        it('should throw 404 if property type not found', async () => {
            mockRepo.get.mockResolvedValue(null);

            await expect(service.updatePropertyType(ORG_ID, 'missing', { name: 'x' })).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    describe('deletePropertyType', () => {
        it('should delete property type without publishing event', async () => {
            mockRepo.delete.mockResolvedValue(undefined);

            await service.deletePropertyType(ORG_ID, 'pt-1');

            expect(mockRepo.delete).toHaveBeenCalledWith(ORG_ID, 'pt-1');
            expect(mockPublisher.publish).not.toHaveBeenCalled();
        });
    });
});
