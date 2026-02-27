import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/observability', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    tracer: { captureAWSv3Client: (c: any) => c },
    metrics: { addMetric: vi.fn() },
}));

vi.mock('../../src/entities/service', () => ({
    DBService: {
        entities: {
            organization: {
                create: vi.fn(),
                get: vi.fn(),
                scan: { go: vi.fn() },
                patch: vi.fn(),
                delete: vi.fn(),
                query: {
                    bySlug: vi.fn(),
                    byStatus: vi.fn(),
                },
            },
        },
    },
}));

import { DynamoOrganizationRepository } from '../../src/adapters/dynamo-organization-repository';
import { DBService } from '../../src/entities/service';

const mockOrganization = {
    organizationId: 'org-1',
    name: 'Test Org',
    slug: 'test-org',
    status: 'active' as const,
    ownerUserId: 'user-1',
    billingEmail: 'billing@test.com',
    phone: '555-1234',
    address: '123 Main St',
    city: 'Denver',
    state: 'CO',
    zip: '80202',
    timezone: 'America/Denver',
    config: {
        brandColor: '#4F46E5',
        invoiceDayOfMonth: 1,
    },
    secretsArn: undefined,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
};

describe('DynamoOrganizationRepository', () => {
    let repo: DynamoOrganizationRepository;
    const mockEntity = (DBService.entities as any).organization;

    beforeEach(() => {
        vi.clearAllMocks();
        repo = new DynamoOrganizationRepository();
    });

    describe('create', () => {
        it('should create an organization and return the parsed result', async () => {
            mockEntity.create.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: mockOrganization }) });

            const result = await repo.create(mockOrganization);

            expect(mockEntity.create).toHaveBeenCalled();
            expect(result.organizationId).toBe('org-1');
            expect(result.name).toBe('Test Org');
        });

        it('should throw Data integrity error when create returns invalid data', async () => {
            mockEntity.create.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: { organizationId: 'org-1' } }) });

            await expect(repo.create(mockOrganization)).rejects.toThrow('Data integrity error');
        });
    });

    describe('get', () => {
        it('should return a parsed organization when found', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: mockOrganization }) });

            const result = await repo.get('org-1');

            expect(result).not.toBeNull();
            expect(result!.organizationId).toBe('org-1');
        });

        it('should return null when organization not found', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: null }) });

            const result = await repo.get('org-1');

            expect(result).toBeNull();
        });

        it('should throw Data integrity error when get returns invalid data', async () => {
            mockEntity.get.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: { badField: true } }) });

            await expect(repo.get('org-1')).rejects.toThrow('Data integrity error');
        });
    });

    describe('getBySlug', () => {
        it('should return organization when found by slug', async () => {
            mockEntity.query.bySlug.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: [mockOrganization] }) });

            const result = await repo.getBySlug('test-org');

            expect(result).not.toBeNull();
            expect(result!.slug).toBe('test-org');
        });

        it('should return null when no organization found by slug', async () => {
            mockEntity.query.bySlug.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: [] }) });

            const result = await repo.getBySlug('nonexistent');

            expect(result).toBeNull();
        });

        it('should return null when data array is undefined', async () => {
            mockEntity.query.bySlug.mockReturnValue({ go: vi.fn().mockResolvedValue({ data: null }) });

            const result = await repo.getBySlug('nonexistent');

            expect(result).toBeNull();
        });
    });

    describe('list', () => {
        it('should return paginated list of organizations', async () => {
            mockEntity.scan.go.mockResolvedValue({ data: [mockOrganization], cursor: null });

            const result = await repo.list();

            expect(result.items).toHaveLength(1);
            expect(result.items[0].organizationId).toBe('org-1');
            expect(result.cursor).toBeNull();
        });

        it('should pass limit and cursor options to scan', async () => {
            mockEntity.scan.go.mockResolvedValue({ data: [mockOrganization], cursor: 'next-page' });

            const result = await repo.list({ limit: 5, cursor: 'some-cursor' });

            expect(mockEntity.scan.go).toHaveBeenCalledWith({ limit: 5, cursor: 'some-cursor' });
            expect(result.cursor).toBe('next-page');
        });

        it('should use default page size when no options provided', async () => {
            mockEntity.scan.go.mockResolvedValue({ data: [], cursor: null });

            await repo.list();

            expect(mockEntity.scan.go).toHaveBeenCalledWith({ limit: 20 });
        });
    });

    describe('listByStatus', () => {
        it('should return organizations filtered by status', async () => {
            mockEntity.query.byStatus.mockReturnValue({
                go: vi.fn().mockResolvedValue({ data: [mockOrganization], cursor: null }),
            });

            const result = await repo.listByStatus('active');

            expect(result.items).toHaveLength(1);
            expect(result.items[0].status).toBe('active');
        });

        it('should pass limit and cursor to status query', async () => {
            const goFn = vi.fn().mockResolvedValue({ data: [], cursor: 'next' });
            mockEntity.query.byStatus.mockReturnValue({ go: goFn });

            await repo.listByStatus('active', { limit: 10, cursor: 'cur' });

            expect(mockEntity.query.byStatus).toHaveBeenCalledWith({ status: 'active' });
            expect(goFn).toHaveBeenCalledWith({ limit: 10, cursor: 'cur' });
        });
    });

    describe('update', () => {
        it('should update an organization and return the parsed result', async () => {
            const updatedOrg = { ...mockOrganization, name: 'Updated Org' };
            mockEntity.patch.mockReturnValue({
                set: vi.fn().mockReturnValue({ go: vi.fn().mockResolvedValue({ data: updatedOrg }) }),
            });

            const result = await repo.update('org-1', { name: 'Updated Org' });

            expect(result.name).toBe('Updated Org');
        });

        it('should throw Data integrity error when update returns invalid data', async () => {
            mockEntity.patch.mockReturnValue({
                set: vi.fn().mockReturnValue({ go: vi.fn().mockResolvedValue({ data: { badField: true } }) }),
            });

            await expect(repo.update('org-1', { name: 'Updated' })).rejects.toThrow('Data integrity error');
        });
    });

    describe('updateConfig', () => {
        it('should update config and return the parsed result', async () => {
            const updatedOrg = { ...mockOrganization, config: { brandColor: '#000000' } };
            mockEntity.patch.mockReturnValue({
                set: vi.fn().mockReturnValue({ go: vi.fn().mockResolvedValue({ data: updatedOrg }) }),
            });

            const result = await repo.updateConfig('org-1', { brandColor: '#000000' });

            expect(result.config).toEqual({ brandColor: '#000000' });
        });
    });

    describe('delete', () => {
        it('should delete an organization', async () => {
            mockEntity.delete.mockReturnValue({ go: vi.fn().mockResolvedValue({}) });

            await expect(repo.delete('org-1')).resolves.toBeUndefined();
            expect(mockEntity.delete).toHaveBeenCalledWith({ organizationId: 'org-1' });
        });
    });
});
