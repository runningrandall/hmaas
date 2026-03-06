import { describe, it, expect } from 'vitest';
import { PreTokenGenerationV2TriggerEvent } from 'aws-lambda';
import { handler } from '../../src/auth/pre-token-generation';

const makeEvent = (userAttributes: Record<string, string> = {}): PreTokenGenerationV2TriggerEvent =>
    ({
        request: {
            userAttributes,
        },
        response: {},
    }) as any;

describe('pre-token-generation handler', () => {
    it('should add organizationId to access token claims from userAttributes', async () => {
        const event = makeEvent({ 'custom:organizationId': 'org-123' });

        const result = await handler(event);

        expect(result.response.claimsAndScopeOverrideDetails?.accessTokenGeneration?.claimsToAddOrOverride?.['custom:organizationId']).toBe('org-123');
    });

    it('should add organizationId to id token claims from userAttributes', async () => {
        const event = makeEvent({ 'custom:organizationId': 'org-123' });

        const result = await handler(event);

        expect(result.response.claimsAndScopeOverrideDetails?.idTokenGeneration?.claimsToAddOrOverride?.['custom:organizationId']).toBe('org-123');
    });

    it('should use empty string when custom:organizationId is not in userAttributes', async () => {
        const event = makeEvent({});

        const result = await handler(event);

        expect(result.response.claimsAndScopeOverrideDetails?.accessTokenGeneration?.claimsToAddOrOverride?.['custom:organizationId']).toBe('');
    });

    it('should return the event with response set', async () => {
        const event = makeEvent({ 'custom:organizationId': 'org-456' });

        const result = await handler(event);

        expect(result).toBe(event);
        expect(result.response).toEqual({
            claimsAndScopeOverrideDetails: {
                accessTokenGeneration: {
                    claimsToAddOrOverride: {
                        'custom:organizationId': 'org-456',
                    },
                },
                idTokenGeneration: {
                    claimsToAddOrOverride: {
                        'custom:organizationId': 'org-456',
                    },
                },
            },
        });
    });
});
