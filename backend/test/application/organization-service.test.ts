import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/observability', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), addContext: vi.fn() },
    tracer: { captureAWSv3Client: (c: any) => c },
    metrics: { addMetric: vi.fn() },
}));

import { OrganizationService } from '../../src/application/organization-service';
import { AppError } from '../../src/lib/error';

const mockOrgRepo = {
    create: vi.fn(),
    get: vi.fn(),
    getBySlug: vi.fn(),
    list: vi.fn(),
    listByStatus: vi.fn(),
    update: vi.fn(),
    updateConfig: vi.fn(),
    delete: vi.fn(),
};

const mockSecretsMgr = {
    getSecrets: vi.fn(),
    getSecret: vi.fn(),
    setSecret: vi.fn(),
    deleteSecret: vi.fn(),
};

const mockPublisher = { publish: vi.fn() };

describe('OrganizationService', () => {
    let service: OrganizationService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new OrganizationService(mockOrgRepo as any, mockSecretsMgr as any, mockPublisher as any);
    });

    describe('createOrganization', () => {
        const request = {
            name: 'Test Org',
            slug: 'test-org',
            ownerUserId: 'user-1',
            billingEmail: 'billing@test.com',
            phone: '555-1234',
        };

        it('should create organization, publish event, and record metric', async () => {
            mockOrgRepo.getBySlug.mockResolvedValue(null);
            const createdOrg = {
                organizationId: 'org-1',
                ...request,
                status: 'active',
                createdAt: '2024-01-01T00:00:00.000Z',
            };
            mockOrgRepo.create.mockResolvedValue(createdOrg);
            mockPublisher.publish.mockResolvedValue(undefined);

            const { metrics } = await import('../../src/lib/observability');

            const result = await service.createOrganization(request);

            expect(result).toEqual(createdOrg);
            expect(mockOrgRepo.create).toHaveBeenCalledOnce();
            expect(mockPublisher.publish).toHaveBeenCalledWith('OrganizationCreated', expect.objectContaining({
                organizationId: expect.any(String),
            }));
            expect(metrics.addMetric).toHaveBeenCalledWith('OrganizationsCreated', expect.any(String), 1);
        });

        it('should set status to active and populate createdAt', async () => {
            mockOrgRepo.getBySlug.mockResolvedValue(null);
            mockOrgRepo.create.mockImplementation(async (o: any) => o);
            mockPublisher.publish.mockResolvedValue(undefined);

            const result = await service.createOrganization(request);

            expect(result.status).toBe('active');
            expect(result.createdAt).toEqual(expect.any(String));
            expect(result.organizationId).toEqual(expect.any(String));
        });

        it('should throw 409 if slug already exists', async () => {
            mockOrgRepo.getBySlug.mockResolvedValue({ organizationId: 'existing-org', slug: 'test-org' });

            await expect(service.createOrganization(request)).rejects.toThrow(AppError);
            await expect(service.createOrganization(request)).rejects.toMatchObject({ statusCode: 409 });
        });
    });

    describe('getOrganization', () => {
        it('should return organization when found', async () => {
            const org = { organizationId: 'org-1', name: 'Test Org' };
            mockOrgRepo.get.mockResolvedValue(org);

            const result = await service.getOrganization('org-1');

            expect(result).toEqual(org);
            expect(mockOrgRepo.get).toHaveBeenCalledWith('org-1');
        });

        it('should throw AppError 404 when organization not found', async () => {
            mockOrgRepo.get.mockResolvedValue(null);

            await expect(service.getOrganization('missing')).rejects.toThrow(AppError);
            await expect(service.getOrganization('missing')).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    describe('getOrganizationBySlug', () => {
        it('should return organization when found by slug', async () => {
            const org = { organizationId: 'org-1', slug: 'test-org' };
            mockOrgRepo.getBySlug.mockResolvedValue(org);

            const result = await service.getOrganizationBySlug('test-org');

            expect(result).toEqual(org);
        });

        it('should throw 404 when not found by slug', async () => {
            mockOrgRepo.getBySlug.mockResolvedValue(null);

            await expect(service.getOrganizationBySlug('nonexistent')).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    describe('listOrganizations', () => {
        it('should delegate to repo.list with options', async () => {
            const paginated = { items: [{ organizationId: 'org-1' }], cursor: null };
            mockOrgRepo.list.mockResolvedValue(paginated);

            const options = { limit: 10 };
            const result = await service.listOrganizations(options);

            expect(result).toEqual(paginated);
            expect(mockOrgRepo.list).toHaveBeenCalledWith(options);
        });
    });

    describe('updateOrganization', () => {
        it('should update organization successfully', async () => {
            const existing = { organizationId: 'org-1', status: 'active', slug: 'test-org' };
            const updated = { organizationId: 'org-1', status: 'active', name: 'Updated' };
            mockOrgRepo.get.mockResolvedValue(existing);
            mockOrgRepo.update.mockResolvedValue(updated);
            mockPublisher.publish.mockResolvedValue(undefined);

            const result = await service.updateOrganization('org-1', { name: 'Updated' });

            expect(result).toEqual(updated);
            expect(mockOrgRepo.update).toHaveBeenCalledWith('org-1', { name: 'Updated' });
        });

        it('should publish OrganizationSuspended when status changes to suspended', async () => {
            const existing = { organizationId: 'org-1', status: 'active', slug: 'test-org' };
            const updated = { organizationId: 'org-1', status: 'suspended' };
            mockOrgRepo.get.mockResolvedValue(existing);
            mockOrgRepo.update.mockResolvedValue(updated);
            mockPublisher.publish.mockResolvedValue(undefined);

            await service.updateOrganization('org-1', { status: 'suspended' });

            expect(mockPublisher.publish).toHaveBeenCalledWith('OrganizationSuspended', {
                organizationId: 'org-1',
                previousStatus: 'active',
            });
        });

        it('should NOT publish event when status does not change', async () => {
            const existing = { organizationId: 'org-1', status: 'active', slug: 'test-org' };
            const updated = { organizationId: 'org-1', status: 'active', name: 'Updated' };
            mockOrgRepo.get.mockResolvedValue(existing);
            mockOrgRepo.update.mockResolvedValue(updated);
            mockPublisher.publish.mockResolvedValue(undefined);

            await service.updateOrganization('org-1', { name: 'Updated', status: 'active' });

            expect(mockPublisher.publish).not.toHaveBeenCalled();
        });

        it('should throw 409 if new slug already exists', async () => {
            const existing = { organizationId: 'org-1', status: 'active', slug: 'test-org' };
            mockOrgRepo.get.mockResolvedValue(existing);
            mockOrgRepo.getBySlug.mockResolvedValue({ organizationId: 'org-2', slug: 'taken-slug' });

            await expect(service.updateOrganization('org-1', { slug: 'taken-slug' })).rejects.toMatchObject({ statusCode: 409 });
        });

        it('should not check slug uniqueness when slug is unchanged', async () => {
            const existing = { organizationId: 'org-1', status: 'active', slug: 'test-org' };
            const updated = { ...existing, name: 'Updated' };
            mockOrgRepo.get.mockResolvedValue(existing);
            mockOrgRepo.update.mockResolvedValue(updated);

            await service.updateOrganization('org-1', { slug: 'test-org', name: 'Updated' });

            expect(mockOrgRepo.getBySlug).not.toHaveBeenCalled();
        });

        it('should throw 404 if organization not found during update', async () => {
            mockOrgRepo.get.mockResolvedValue(null);

            await expect(service.updateOrganization('missing', { name: 'Updated' })).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    describe('deleteOrganization', () => {
        it('should delete organization', async () => {
            mockOrgRepo.delete.mockResolvedValue(undefined);

            await service.deleteOrganization('org-1');

            expect(mockOrgRepo.delete).toHaveBeenCalledWith('org-1');
        });
    });

    describe('getConfig', () => {
        it('should return organization config', async () => {
            const org = { organizationId: 'org-1', config: { brandColor: '#4F46E5', invoiceDayOfMonth: 1 } };
            mockOrgRepo.get.mockResolvedValue(org);

            const result = await service.getConfig('org-1');

            expect(result).toEqual({ brandColor: '#4F46E5', invoiceDayOfMonth: 1 });
        });

        it('should return empty object when no config set', async () => {
            const org = { organizationId: 'org-1' };
            mockOrgRepo.get.mockResolvedValue(org);

            const result = await service.getConfig('org-1');

            expect(result).toEqual({});
        });

        it('should throw 404 if organization not found', async () => {
            mockOrgRepo.get.mockResolvedValue(null);

            await expect(service.getConfig('missing')).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    describe('updateConfig', () => {
        it('should update config and publish event', async () => {
            const org = { organizationId: 'org-1', config: {} };
            const updatedOrg = { organizationId: 'org-1', config: { brandColor: '#000000' } };
            mockOrgRepo.get.mockResolvedValue(org);
            mockOrgRepo.updateConfig.mockResolvedValue(updatedOrg);
            mockPublisher.publish.mockResolvedValue(undefined);

            const result = await service.updateConfig('org-1', { brandColor: '#000000' });

            expect(result.config).toEqual({ brandColor: '#000000' });
            expect(mockPublisher.publish).toHaveBeenCalledWith('OrganizationConfigUpdated', { organizationId: 'org-1' });
        });

        it('should throw 404 if organization not found', async () => {
            mockOrgRepo.get.mockResolvedValue(null);

            await expect(service.updateConfig('missing', { brandColor: '#000' })).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    describe('getSecrets', () => {
        it('should return masked secrets', async () => {
            const org = { organizationId: 'org-1' };
            mockOrgRepo.get.mockResolvedValue(org);
            mockSecretsMgr.getSecrets.mockResolvedValue({ stripeKey: 'sk_test_123', webhookSecret: 'whsec_abc' });

            const result = await service.getSecrets('org-1');

            expect(result).toEqual({ stripeKey: '********', webhookSecret: '********' });
        });

        it('should return empty object when no secrets exist', async () => {
            const org = { organizationId: 'org-1' };
            mockOrgRepo.get.mockResolvedValue(org);
            mockSecretsMgr.getSecrets.mockResolvedValue({});

            const result = await service.getSecrets('org-1');

            expect(result).toEqual({});
        });

        it('should throw 404 if organization not found', async () => {
            mockOrgRepo.get.mockResolvedValue(null);

            await expect(service.getSecrets('missing')).rejects.toMatchObject({ statusCode: 404 });
        });
    });

    describe('setSecret', () => {
        it('should set a secret for the organization', async () => {
            const org = { organizationId: 'org-1' };
            mockOrgRepo.get.mockResolvedValue(org);
            mockSecretsMgr.setSecret.mockResolvedValue(undefined);

            await service.setSecret('org-1', 'stripeKey', 'sk_test_new');

            expect(mockSecretsMgr.setSecret).toHaveBeenCalledWith('org-1', 'stripeKey', 'sk_test_new');
        });

        it('should throw 404 if organization not found', async () => {
            mockOrgRepo.get.mockResolvedValue(null);

            await expect(service.setSecret('missing', 'key', 'val')).rejects.toMatchObject({ statusCode: 404 });
        });
    });
});
