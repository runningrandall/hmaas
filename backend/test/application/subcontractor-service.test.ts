import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/observability', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), addContext: vi.fn() },
    tracer: { captureAWSv3Client: (c: any) => c },
    metrics: { addMetric: vi.fn() },
}));

import { SubcontractorService } from '../../src/application/subcontractor-service';
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

describe('SubcontractorService', () => {
    let service: SubcontractorService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new SubcontractorService(mockRepo as any, mockPublisher as any);
    });

    describe('createSubcontractor', () => {
        it('should create subcontractor with active status and publish event', async () => {
            const request = {
                name: 'ABC Lawn Care',
                email: 'abc@lawn.com',
                contactName: 'John',
                phone: '555-0200',
            };

            const created = {
                organizationId: ORG_ID,
                subcontractorId: 'sub-1',
                ...request,
                status: 'active',
                createdAt: '2026-01-01T00:00:00.000Z',
            };

            mockRepo.create.mockResolvedValue(created);
            mockPublisher.publish.mockResolvedValue(undefined);

            const { metrics } = await import('../../src/lib/observability');

            const result = await service.createSubcontractor(ORG_ID, request);

            expect(result).toEqual(created);
            expect(mockRepo.create).toHaveBeenCalledOnce();
            expect(mockPublisher.publish).toHaveBeenCalledWith('SubcontractorCreated', expect.objectContaining({
                organizationId: ORG_ID,
                subcontractorId: created.subcontractorId,
            }));
            expect(metrics.addMetric).toHaveBeenCalledWith('SubcontractorsCreated', expect.any(String), 1);
        });

        it('should set status to active and populate subcontractorId and createdAt', async () => {
            const request = { name: 'Test Sub', email: 'test@sub.com' };

            mockRepo.create.mockImplementation(async (s: any) => s);
            mockPublisher.publish.mockResolvedValue(undefined);

            const result = await service.createSubcontractor(ORG_ID, request);

            expect(result.status).toBe('active');
            expect(result.createdAt).toEqual(expect.any(String));
            expect(result.subcontractorId).toEqual(expect.any(String));
        });
    });

    describe('getSubcontractor', () => {
        it('should return subcontractor when found', async () => {
            const subcontractor = { organizationId: ORG_ID, subcontractorId: 'sub-1', name: 'ABC', status: 'active' };
            mockRepo.get.mockResolvedValue(subcontractor);

            const result = await service.getSubcontractor(ORG_ID, 'sub-1');

            expect(result).toEqual(subcontractor);
            expect(mockRepo.get).toHaveBeenCalledWith(ORG_ID, 'sub-1');
        });

        it('should throw AppError 404 when not found', async () => {
            mockRepo.get.mockResolvedValue(null);

            await expect(service.getSubcontractor(ORG_ID, 'missing')).rejects.toThrow(AppError);
            await expect(service.getSubcontractor(ORG_ID, 'missing')).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    describe('listSubcontractors', () => {
        it('should delegate to repo.list', async () => {
            const paginated = { items: [{ subcontractorId: 'sub-1' }], cursor: null };
            mockRepo.list.mockResolvedValue(paginated);

            const result = await service.listSubcontractors(ORG_ID, { limit: 10 });

            expect(result).toEqual(paginated);
            expect(mockRepo.list).toHaveBeenCalledWith(ORG_ID, { limit: 10 });
        });
    });

    describe('updateSubcontractor', () => {
        it('should update subcontractor and return updated', async () => {
            const existing = { organizationId: ORG_ID, subcontractorId: 'sub-1', name: 'ABC', status: 'active' };
            const updated = { ...existing, name: 'ABC Updated' };
            mockRepo.get.mockResolvedValue(existing);
            mockRepo.update.mockResolvedValue(updated);

            const result = await service.updateSubcontractor(ORG_ID, 'sub-1', { name: 'ABC Updated' });

            expect(result).toEqual(updated);
        });

        it('should throw 404 if not found', async () => {
            mockRepo.get.mockResolvedValue(null);

            await expect(service.updateSubcontractor(ORG_ID, 'missing', { name: 'X' })).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    describe('deleteSubcontractor', () => {
        it('should delete subcontractor', async () => {
            mockRepo.delete.mockResolvedValue(undefined);

            await service.deleteSubcontractor(ORG_ID, 'sub-1');

            expect(mockRepo.delete).toHaveBeenCalledWith(ORG_ID, 'sub-1');
        });
    });
});
