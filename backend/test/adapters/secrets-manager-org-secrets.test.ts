import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/observability', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    tracer: { captureAWSv3Client: (c: any) => c },
    metrics: { addMetric: vi.fn() },
}));

const mockSend = vi.fn();

vi.mock('@aws-sdk/client-secrets-manager', () => {
    class ResourceNotFoundException extends Error {
        name = 'ResourceNotFoundException';
        constructor() { super('Resource not found'); }
    }
    return {
        SecretsManagerClient: vi.fn().mockImplementation(function () { return { send: mockSend }; }),
        GetSecretValueCommand: vi.fn().mockImplementation(function (input: any) { return { input, _type: 'GetSecretValue' }; }),
        CreateSecretCommand: vi.fn().mockImplementation(function (input: any) { return { input, _type: 'CreateSecret' }; }),
        PutSecretValueCommand: vi.fn().mockImplementation(function (input: any) { return { input, _type: 'PutSecretValue' }; }),
        ResourceNotFoundException,
    };
});

import { SecretsManagerOrgSecrets } from '../../src/adapters/secrets-manager-org-secrets';
import { ResourceNotFoundException } from '@aws-sdk/client-secrets-manager';

describe('SecretsManagerOrgSecrets', () => {
    let secrets: SecretsManagerOrgSecrets;

    beforeEach(() => {
        vi.clearAllMocks();
        secrets = new SecretsManagerOrgSecrets();
    });

    describe('getSecrets', () => {
        it('should return parsed secrets when they exist', async () => {
            mockSend.mockResolvedValue({ SecretString: JSON.stringify({ stripeKey: 'sk_test_123' }) });

            const result = await secrets.getSecrets('org-1');

            expect(result).toEqual({ stripeKey: 'sk_test_123' });
        });

        it('should return empty object when secret not found', async () => {
            mockSend.mockRejectedValue(new ResourceNotFoundException());

            const result = await secrets.getSecrets('org-1');

            expect(result).toEqual({});
        });

        it('should return empty object when SecretString is empty', async () => {
            mockSend.mockResolvedValue({ SecretString: null });

            const result = await secrets.getSecrets('org-1');

            expect(result).toEqual({});
        });

        it('should throw on unexpected errors', async () => {
            mockSend.mockRejectedValue(new Error('Network error'));

            await expect(secrets.getSecrets('org-1')).rejects.toThrow('Network error');
        });
    });

    describe('getSecret', () => {
        it('should return a specific secret value', async () => {
            mockSend.mockResolvedValue({ SecretString: JSON.stringify({ stripeKey: 'sk_test_123', webhookSecret: 'whsec_abc' }) });

            const result = await secrets.getSecret('org-1', 'stripeKey');

            expect(result).toBe('sk_test_123');
        });

        it('should return null when key does not exist', async () => {
            mockSend.mockResolvedValue({ SecretString: JSON.stringify({ stripeKey: 'sk_test_123' }) });

            const result = await secrets.getSecret('org-1', 'nonexistent');

            expect(result).toBeNull();
        });
    });

    describe('setSecret', () => {
        it('should set a secret using PutSecretValue', async () => {
            // First call: getSecrets (PutSecretValue succeeds)
            mockSend
                .mockResolvedValueOnce({ SecretString: JSON.stringify({ existing: 'value' }) })
                .mockResolvedValueOnce({});

            await secrets.setSecret('org-1', 'stripeKey', 'sk_test_new');

            expect(mockSend).toHaveBeenCalledTimes(2);
        });

        it('should create secret if it does not exist', async () => {
            // First call: getSecrets returns ResourceNotFoundException
            // Second call: PutSecretValue throws ResourceNotFoundException
            // Third call: CreateSecret succeeds
            mockSend
                .mockRejectedValueOnce(new ResourceNotFoundException())
                .mockRejectedValueOnce(new ResourceNotFoundException())
                .mockResolvedValueOnce({});

            await secrets.setSecret('org-1', 'stripeKey', 'sk_test_new');

            expect(mockSend).toHaveBeenCalledTimes(3);
        });

        it('should throw on unexpected error during set', async () => {
            mockSend
                .mockResolvedValueOnce({ SecretString: JSON.stringify({}) })
                .mockRejectedValueOnce(new Error('Access denied'));

            await expect(secrets.setSecret('org-1', 'key', 'val')).rejects.toThrow('Access denied');
        });
    });

    describe('deleteSecret', () => {
        it('should remove key from secrets and update', async () => {
            mockSend
                .mockResolvedValueOnce({ SecretString: JSON.stringify({ stripeKey: 'sk_test', webhookSecret: 'whsec' }) })
                .mockResolvedValueOnce({});

            await secrets.deleteSecret('org-1', 'stripeKey');

            expect(mockSend).toHaveBeenCalledTimes(2);
        });

        it('should handle ResourceNotFoundException on delete gracefully', async () => {
            mockSend
                .mockResolvedValueOnce({ SecretString: JSON.stringify({ stripeKey: 'sk_test' }) })
                .mockRejectedValueOnce(new ResourceNotFoundException());

            await expect(secrets.deleteSecret('org-1', 'stripeKey')).resolves.toBeUndefined();
        });

        it('should handle when no secrets exist', async () => {
            mockSend
                .mockRejectedValueOnce(new ResourceNotFoundException())
                .mockRejectedValueOnce(new ResourceNotFoundException());

            await expect(secrets.deleteSecret('org-1', 'key')).resolves.toBeUndefined();
        });

        it('should throw on unexpected error during delete', async () => {
            mockSend
                .mockResolvedValueOnce({ SecretString: JSON.stringify({ key: 'val' }) })
                .mockRejectedValueOnce(new Error('Network error'));

            await expect(secrets.deleteSecret('org-1', 'key')).rejects.toThrow('Network error');
        });
    });
});
