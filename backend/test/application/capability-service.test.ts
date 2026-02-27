import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/observability', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), addContext: vi.fn() },
    tracer: { captureAWSv3Client: (c: any) => c },
    metrics: { addMetric: vi.fn() },
}));

import { CapabilityService } from '../../src/application/capability-service';
import { AppError } from '../../src/lib/error';

const mockRepo = {
    create: vi.fn(),
    get: vi.fn(),
    listByEmployeeId: vi.fn(),
    delete: vi.fn(),
};

const mockPublisher = { publish: vi.fn() };

const ORG_ID = 'org-test-123';

describe('CapabilityService', () => {
    let service: CapabilityService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new CapabilityService(mockRepo as any, mockPublisher as any);
    });

    describe('createCapability', () => {
        it('should create capability, publish CapabilityCreated event, and record metric', async () => {
            const request = {
                employeeId: 'emp-1',
                serviceTypeId: 'svc-type-1',
                level: 'expert',
                certificationDate: '2024-01-01',
            };

            const created = {
                organizationId: ORG_ID,
                capabilityId: 'cap-1',
                ...request,
                createdAt: '2024-01-01T00:00:00.000Z',
            };

            mockRepo.create.mockResolvedValue(created);
            mockPublisher.publish.mockResolvedValue(undefined);

            const { metrics } = await import('../../src/lib/observability');

            const result = await service.createCapability(ORG_ID, request as any);

            expect(result).toEqual(created);
            expect(mockRepo.create).toHaveBeenCalledOnce();
            expect(mockPublisher.publish).toHaveBeenCalledWith('CapabilityCreated', expect.objectContaining({
                organizationId: ORG_ID,
                capabilityId: created.capabilityId,
                employeeId: request.employeeId,
            }));
            expect(metrics.addMetric).toHaveBeenCalledWith('CapabilitiesCreated', expect.any(String), 1);
        });

        it('should populate capabilityId and createdAt', async () => {
            const request = {
                employeeId: 'emp-2',
                serviceTypeId: 'svc-type-2',
                level: 'basic',
                certificationDate: '2024-03-15',
            };

            mockRepo.create.mockImplementation(async (c: any) => c);
            mockPublisher.publish.mockResolvedValue(undefined);

            const result = await service.createCapability(ORG_ID, request as any);

            expect(result.capabilityId).toEqual(expect.any(String));
            expect(result.createdAt).toEqual(expect.any(String));
        });
    });

    describe('getCapability', () => {
        it('should return capability when found', async () => {
            const capability = { organizationId: ORG_ID, capabilityId: 'cap-1', employeeId: 'emp-1', level: 'expert' };
            mockRepo.get.mockResolvedValue(capability);

            const result = await service.getCapability(ORG_ID, 'cap-1');

            expect(result).toEqual(capability);
            expect(mockRepo.get).toHaveBeenCalledWith(ORG_ID, 'cap-1');
        });

        it('should throw AppError 404 when capability not found', async () => {
            mockRepo.get.mockResolvedValue(null);

            await expect(service.getCapability(ORG_ID, 'missing')).rejects.toThrow(AppError);
            await expect(service.getCapability(ORG_ID, 'missing')).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    describe('listCapabilitiesByEmployee', () => {
        it('should delegate to repo.listByEmployeeId', async () => {
            const paginated = { items: [{ organizationId: ORG_ID, capabilityId: 'cap-1', employeeId: 'emp-1' }], count: 1 };
            mockRepo.listByEmployeeId.mockResolvedValue(paginated);

            const result = await service.listCapabilitiesByEmployee(ORG_ID, 'emp-1', { limit: 10 });

            expect(result).toEqual(paginated);
            expect(mockRepo.listByEmployeeId).toHaveBeenCalledWith(ORG_ID, 'emp-1', { limit: 10 });
        });
    });

    describe('deleteCapability', () => {
        it('should fetch capability first then delete it', async () => {
            const capability = { organizationId: ORG_ID, capabilityId: 'cap-1', employeeId: 'emp-1' };
            mockRepo.get.mockResolvedValue(capability);
            mockRepo.delete.mockResolvedValue(undefined);

            await service.deleteCapability(ORG_ID, 'cap-1');

            expect(mockRepo.get).toHaveBeenCalledWith(ORG_ID, 'cap-1');
            expect(mockRepo.delete).toHaveBeenCalledWith(ORG_ID, 'cap-1');
        });

        it('should throw 404 if capability not found before deleting', async () => {
            mockRepo.get.mockResolvedValue(null);

            await expect(service.deleteCapability(ORG_ID, 'missing')).rejects.toMatchObject({ statusCode: 404 });
            expect(mockRepo.delete).not.toHaveBeenCalled();
        });

        it('should not publish any event on delete', async () => {
            const capability = { organizationId: ORG_ID, capabilityId: 'cap-1', employeeId: 'emp-1' };
            mockRepo.get.mockResolvedValue(capability);
            mockRepo.delete.mockResolvedValue(undefined);

            await service.deleteCapability(ORG_ID, 'cap-1');

            expect(mockPublisher.publish).not.toHaveBeenCalled();
        });
    });
});
