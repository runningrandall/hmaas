import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/observability', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), addContext: vi.fn() },
    tracer: { captureAWSv3Client: (c: any) => c },
    metrics: { addMetric: vi.fn() },
}));

import { PropertyService } from '../../src/application/property-service';
import { AppError } from '../../src/lib/error';

const mockRepo = {
    create: vi.fn(),
    get: vi.fn(),
    list: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    listByCustomerId: vi.fn(),
};

const mockPublisher = { publish: vi.fn() };

const ORG_ID = 'org-test-123';

describe('PropertyService', () => {
    let service: PropertyService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new PropertyService(mockRepo as any, mockPublisher as any);
    });

    describe('createProperty', () => {
        it('should create property with status active, publish PropertyCreated event, and record metric', async () => {
            const request = {
                customerId: 'cust-1',
                propertyTypeId: 'pt-1',
                name: 'Main House',
                address: '123 Main St',
                city: 'Springfield',
                state: 'IL',
                zip: '62701',
                lat: 39.78,
                lng: -89.65,
                lotSize: 5000,
                notes: 'Corner lot',
            };

            const created = {
                organizationId: ORG_ID,
                propertyId: 'prop-1',
                ...request,
                status: 'active',
                createdAt: '2024-01-01T00:00:00.000Z',
            };

            mockRepo.create.mockResolvedValue(created);
            mockPublisher.publish.mockResolvedValue(undefined);

            const { metrics } = await import('../../src/lib/observability');

            const result = await service.createProperty(ORG_ID, request);

            expect(result).toEqual(created);
            expect(mockRepo.create).toHaveBeenCalledOnce();
            expect(mockPublisher.publish).toHaveBeenCalledWith('PropertyCreated', expect.objectContaining({
                organizationId: ORG_ID,
                propertyId: created.propertyId,
                customerId: request.customerId,
            }));
            expect(metrics.addMetric).toHaveBeenCalledWith('PropertiesCreated', expect.any(String), 1);
        });

        it('should set status to active on creation', async () => {
            const request = {
                customerId: 'cust-1',
                propertyTypeId: 'pt-1',
                name: 'Home',
                address: '1 Oak Ave',
                city: 'Shelby',
                state: 'NC',
                zip: '28150',
            };

            mockRepo.create.mockImplementation(async (p: any) => p);
            mockPublisher.publish.mockResolvedValue(undefined);

            const result = await service.createProperty(ORG_ID, request as any);

            expect(result.status).toBe('active');
            expect(result.createdAt).toEqual(expect.any(String));
            expect(result.propertyId).toEqual(expect.any(String));
        });
    });

    describe('getProperty', () => {
        it('should return property when found', async () => {
            const property = { organizationId: ORG_ID, propertyId: 'prop-1', name: 'Main House', status: 'active' };
            mockRepo.get.mockResolvedValue(property);

            const result = await service.getProperty(ORG_ID, 'prop-1');

            expect(result).toEqual(property);
            expect(mockRepo.get).toHaveBeenCalledWith(ORG_ID, 'prop-1');
        });

        it('should throw AppError 404 when property not found', async () => {
            mockRepo.get.mockResolvedValue(null);

            await expect(service.getProperty(ORG_ID, 'missing')).rejects.toThrow(AppError);
            await expect(service.getProperty(ORG_ID, 'missing')).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    describe('listPropertiesByCustomer', () => {
        it('should delegate to repo.listByCustomerId', async () => {
            const paginated = { items: [{ organizationId: ORG_ID, propertyId: 'prop-1' }], count: 1 };
            mockRepo.listByCustomerId.mockResolvedValue(paginated);

            const result = await service.listPropertiesByCustomer(ORG_ID, 'cust-1', { limit: 10 });

            expect(result).toEqual(paginated);
            expect(mockRepo.listByCustomerId).toHaveBeenCalledWith(ORG_ID, 'cust-1', { limit: 10 });
        });
    });

    describe('updateProperty', () => {
        it('should update property and publish PropertyUpdated event', async () => {
            const existing = { organizationId: ORG_ID, propertyId: 'prop-1', customerId: 'cust-1', status: 'active' };
            const updated = { organizationId: ORG_ID, propertyId: 'prop-1', customerId: 'cust-1', status: 'active', name: 'Updated House' };
            mockRepo.get.mockResolvedValue(existing);
            mockRepo.update.mockResolvedValue(updated);
            mockPublisher.publish.mockResolvedValue(undefined);

            const result = await service.updateProperty(ORG_ID, 'prop-1', { name: 'Updated House' });

            expect(result).toEqual(updated);
            expect(mockPublisher.publish).toHaveBeenCalledWith('PropertyUpdated', expect.objectContaining({
                organizationId: ORG_ID,
                propertyId: 'prop-1',
                customerId: 'cust-1',
            }));
        });

        it('should throw 404 if property not found', async () => {
            mockRepo.get.mockResolvedValue(null);

            await expect(service.updateProperty(ORG_ID, 'missing', { name: 'x' })).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    describe('deleteProperty', () => {
        it('should delete property', async () => {
            mockRepo.delete.mockResolvedValue(undefined);

            await service.deleteProperty(ORG_ID, 'prop-1');

            expect(mockRepo.delete).toHaveBeenCalledWith(ORG_ID, 'prop-1');
        });
    });
});
