import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeCreateEvent, makeGetEvent, makeListEvent, makeUpdateEvent, makeDeleteEvent, mockContext } from '../../helpers/test-utils';

vi.mock('../../../src/lib/observability', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), addContext: vi.fn() },
    tracer: { captureAWSv3Client: (c: any) => c },
    metrics: {
        addMetric: vi.fn(),
        publishStoredMetrics: vi.fn(),
        captureColdStartMetric: vi.fn(),
        setThrowOnEmptyMetrics: vi.fn(),
        setDefaultDimensions: vi.fn(),
    },
}));

const mockCreateOrganization = vi.fn();
const mockGetOrganization = vi.fn();
const mockListOrganizations = vi.fn();
const mockUpdateOrganization = vi.fn();
const mockDeleteOrganization = vi.fn();
const mockGetConfig = vi.fn();
const mockUpdateConfig = vi.fn();
const mockGetSecrets = vi.fn();
const mockSetSecret = vi.fn();

vi.mock('../../../src/adapters/dynamo-organization-repository', () => ({
    DynamoOrganizationRepository: vi.fn().mockImplementation(function () { return {}; }),
}));

vi.mock('../../../src/adapters/secrets-manager-org-secrets', () => ({
    SecretsManagerOrgSecrets: vi.fn().mockImplementation(function () { return {}; }),
}));

vi.mock('../../../src/adapters/event-bridge-publisher', () => ({
    EventBridgePublisher: vi.fn().mockImplementation(function () { return {}; }),
}));

vi.mock('../../../src/application/organization-service', () => ({
    OrganizationService: vi.fn().mockImplementation(function () {
        return {
            createOrganization: mockCreateOrganization,
            getOrganization: mockGetOrganization,
            listOrganizations: mockListOrganizations,
            updateOrganization: mockUpdateOrganization,
            deleteOrganization: mockDeleteOrganization,
            getConfig: mockGetConfig,
            updateConfig: mockUpdateConfig,
            getSecrets: mockGetSecrets,
            setSecret: mockSetSecret,
        };
    }),
}));

describe('Organization Handlers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('create handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/organizations/create')).handler;
        });

        it('should return 201 when organization is created with valid body', async () => {
            const mockOrg = {
                organizationId: 'org-123',
                name: 'Test Org',
                slug: 'test-org',
                billingEmail: 'billing@test.com',
                ownerUserId: 'user-1',
            };
            mockCreateOrganization.mockResolvedValue(mockOrg);

            const event = makeCreateEvent({
                name: 'Test Org',
                slug: 'test-org',
                billingEmail: 'billing@test.com',
                ownerUserId: 'user-1',
            });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(201);
            const body = JSON.parse(result.body);
            expect(body.organizationId).toBe('org-123');
            expect(body.name).toBe('Test Org');
        });

        it('should return 400 when body is missing', async () => {
            const event = makeCreateEvent({});
            (event as any).body = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when required fields are missing', async () => {
            const event = makeCreateEvent({ name: 'Test Org' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when slug format is invalid', async () => {
            const event = makeCreateEvent({
                name: 'Test Org',
                slug: 'INVALID SLUG!',
                billingEmail: 'billing@test.com',
                ownerUserId: 'user-1',
            });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when billingEmail is invalid', async () => {
            const event = makeCreateEvent({
                name: 'Test Org',
                slug: 'test-org',
                billingEmail: 'not-an-email',
                ownerUserId: 'user-1',
            });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });

    describe('get handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/organizations/get')).handler;
        });

        it('should return 200 with organization when valid organizationId provided', async () => {
            const mockOrg = { organizationId: 'org-123', name: 'Test Org', slug: 'test-org' };
            mockGetOrganization.mockResolvedValue(mockOrg);

            const event = makeGetEvent({ organizationId: 'org-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.organizationId).toBe('org-123');
        });

        it('should return 400 when organizationId is missing', async () => {
            const event = makeGetEvent({ organizationId: 'org-123' });
            (event as any).pathParameters = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });

    describe('list handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/organizations/list')).handler;
        });

        it('should return 200 with organizations when no params provided', async () => {
            const mockList = { items: [{ organizationId: 'org-123' }], cursor: undefined };
            mockListOrganizations.mockResolvedValue(mockList);

            const event = makeListEvent();
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.items).toHaveLength(1);
        });

        it('should return 200 with organizations when limit and cursor params provided', async () => {
            const mockList = { items: [{ organizationId: 'org-456' }], cursor: 'next-cursor' };
            mockListOrganizations.mockResolvedValue(mockList);

            const event = makeListEvent({ limit: '10', cursor: 'some-cursor' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.items).toHaveLength(1);
            expect(mockListOrganizations).toHaveBeenCalledWith({ limit: 10, cursor: 'some-cursor' });
        });
    });

    describe('update handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/organizations/update')).handler;
        });

        it('should return 200 when organization is updated with valid data', async () => {
            const mockUpdated = { organizationId: 'org-123', name: 'Updated Org' };
            mockUpdateOrganization.mockResolvedValue(mockUpdated);

            const event = makeUpdateEvent({ organizationId: 'org-123' }, { name: 'Updated Org' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.name).toBe('Updated Org');
        });

        it('should return 400 when organizationId is missing', async () => {
            const event = makeUpdateEvent({ organizationId: 'org-123' }, { name: 'Updated' });
            (event as any).pathParameters = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when body is missing', async () => {
            const event = makeUpdateEvent({ organizationId: 'org-123' }, {});
            (event as any).body = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });

    describe('delete handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/organizations/delete')).handler;
        });

        it('should return 200 when organization is deleted', async () => {
            mockDeleteOrganization.mockResolvedValue(undefined);

            const event = makeDeleteEvent({ organizationId: 'org-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.message).toBe('Organization deleted');
        });

        it('should return 400 when organizationId is missing', async () => {
            const event = makeDeleteEvent({ organizationId: 'org-123' });
            (event as any).pathParameters = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });

    describe('getConfig handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/organizations/getConfig')).handler;
        });

        it('should return 200 with config when valid organizationId provided', async () => {
            const mockConfig = { brandColor: '#4F46E5', invoiceDayOfMonth: 1 };
            mockGetConfig.mockResolvedValue(mockConfig);

            const event = makeGetEvent({ organizationId: 'org-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.brandColor).toBe('#4F46E5');
        });

        it('should return 400 when organizationId is missing', async () => {
            const event = makeGetEvent({ organizationId: 'org-123' });
            (event as any).pathParameters = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });

    describe('updateConfig handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/organizations/updateConfig')).handler;
        });

        it('should return 200 when config is updated with valid data', async () => {
            const mockUpdated = { organizationId: 'org-123', config: { brandColor: '#000000' } };
            mockUpdateConfig.mockResolvedValue(mockUpdated);

            const event = makeUpdateEvent({ organizationId: 'org-123' }, { brandColor: '#000000' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.config.brandColor).toBe('#000000');
        });

        it('should return 400 when organizationId is missing', async () => {
            const event = makeUpdateEvent({ organizationId: 'org-123' }, { brandColor: '#000' });
            (event as any).pathParameters = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when body is missing', async () => {
            const event = makeUpdateEvent({ organizationId: 'org-123' }, {});
            (event as any).body = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when invoiceDayOfMonth exceeds 28', async () => {
            const event = makeUpdateEvent({ organizationId: 'org-123' }, { invoiceDayOfMonth: 31 });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when logoUrl is not a valid URL', async () => {
            const event = makeUpdateEvent({ organizationId: 'org-123' }, { logoUrl: 'not-a-url' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });

    describe('getSecrets handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/organizations/getSecrets')).handler;
        });

        it('should return 200 with masked secrets', async () => {
            mockGetSecrets.mockResolvedValue({ stripeKey: '********', webhookSecret: '********' });

            const event = makeGetEvent({ organizationId: 'org-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.stripeKey).toBe('********');
        });

        it('should return 400 when organizationId is missing', async () => {
            const event = makeGetEvent({ organizationId: 'org-123' });
            (event as any).pathParameters = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });

    describe('setSecret handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/organizations/setSecret')).handler;
        });

        it('should return 200 when secret is set successfully', async () => {
            mockSetSecret.mockResolvedValue(undefined);

            const event = makeCreateEvent({ value: 'sk_test_new' }, { organizationId: 'org-123', key: 'stripeKey' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.message).toBe('Secret set successfully');
            expect(mockSetSecret).toHaveBeenCalledWith('org-123', 'stripeKey', 'sk_test_new');
        });

        it('should return 400 when organizationId is missing', async () => {
            const event = makeCreateEvent({ value: 'sk_test' }, { key: 'stripeKey' });
            (event as any).pathParameters = { key: 'stripeKey' };
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when key is missing', async () => {
            const event = makeCreateEvent({ value: 'sk_test' }, { organizationId: 'org-123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when body is missing', async () => {
            const event = makeCreateEvent({ value: 'test' }, { organizationId: 'org-123', key: 'stripeKey' });
            (event as any).body = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when value is empty', async () => {
            const event = makeCreateEvent({ value: '' }, { organizationId: 'org-123', key: 'stripeKey' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });
});
