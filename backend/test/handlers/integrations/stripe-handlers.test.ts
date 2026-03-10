import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeGetEvent, makeUpdateEvent, mockContext, DEFAULT_ORG_ID } from '../../helpers/test-utils';

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
            getSecrets: mockGetSecrets,
            setSecret: mockSetSecret,
        };
    }),
}));

describe('Stripe Integration Handlers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getStripeKeys handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/integrations/getStripeKeys')).handler;
        });

        it('should return 200 with stripe keys when configured', async () => {
            mockGetSecrets.mockResolvedValue({
                stripePublicKey: '********',
                stripeSecretKey: '********',
                otherSecret: '********',
            });

            const event = makeGetEvent({});
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.stripePublicKey).toBe('********');
            expect(body.stripeSecretKey).toBe('********');
            expect(body.otherSecret).toBeUndefined();
        });

        it('should return null for unconfigured stripe keys', async () => {
            mockGetSecrets.mockResolvedValue({});

            const event = makeGetEvent({});
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.stripePublicKey).toBeNull();
            expect(body.stripeSecretKey).toBeNull();
        });

        it('should call getSecrets with organizationId from middleware', async () => {
            mockGetSecrets.mockResolvedValue({});

            const event = makeGetEvent({});
            await handler(event, mockContext);

            expect(mockGetSecrets).toHaveBeenCalledWith(DEFAULT_ORG_ID);
        });
    });

    describe('setStripeKeys handler', () => {
        let handler: any;

        beforeEach(async () => {
            handler = (await import('../../../src/handlers/integrations/setStripeKeys')).handler;
        });

        it('should return 200 when stripe keys are set successfully', async () => {
            mockSetSecret.mockResolvedValue(undefined);

            const event = makeUpdateEvent({}, {
                stripePublicKey: 'pk_test_abc123',
                stripeSecretKey: 'sk_test_xyz789',
            });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.message).toBe('Stripe keys updated successfully');
            expect(mockSetSecret).toHaveBeenCalledWith(DEFAULT_ORG_ID, 'stripePublicKey', 'pk_test_abc123');
            expect(mockSetSecret).toHaveBeenCalledWith(DEFAULT_ORG_ID, 'stripeSecretKey', 'sk_test_xyz789');
        });

        it('should return 400 when body is missing', async () => {
            const event = makeUpdateEvent({}, {});
            (event as any).body = null;
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when stripePublicKey is missing', async () => {
            const event = makeUpdateEvent({}, { stripeSecretKey: 'sk_test_xyz789' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when stripeSecretKey is missing', async () => {
            const event = makeUpdateEvent({}, { stripePublicKey: 'pk_test_abc123' });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when stripePublicKey does not start with pk_', async () => {
            const event = makeUpdateEvent({}, {
                stripePublicKey: 'invalid_key',
                stripeSecretKey: 'sk_test_xyz789',
            });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });

        it('should return 400 when stripeSecretKey does not start with sk_', async () => {
            const event = makeUpdateEvent({}, {
                stripePublicKey: 'pk_test_abc123',
                stripeSecretKey: 'invalid_key',
            });
            const result = await handler(event, mockContext);

            expect(result.statusCode).toBe(400);
        });
    });
});
