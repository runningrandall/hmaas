import { describe, it, expect } from 'vitest';
import { PreTokenGenerationTriggerEvent } from 'aws-lambda';
import { handler } from '../../src/auth/pre-token-generation';

const makeEvent = (userAttributes: Record<string, string> = {}): PreTokenGenerationTriggerEvent =>
    ({
        request: {
            userAttributes,
        },
        response: {},
    }) as any;

describe('pre-token-generation handler', () => {
    it('should add organizationId to claimsToAddOrOverride from userAttributes', async () => {
        const event = makeEvent({ 'custom:organizationId': 'org-123' });

        const result = await handler(event);

        expect(result.response.claimsOverrideDetails?.claimsToAddOrOverride?.['custom:organizationId']).toBe('org-123');
    });

    it('should use empty string when custom:organizationId is not in userAttributes', async () => {
        const event = makeEvent({});

        const result = await handler(event);

        expect(result.response.claimsOverrideDetails?.claimsToAddOrOverride?.['custom:organizationId']).toBe('');
    });

    it('should return the event with response set', async () => {
        const event = makeEvent({ 'custom:organizationId': 'org-456' });

        const result = await handler(event);

        expect(result).toBe(event);
        expect(result.response).toEqual({
            claimsOverrideDetails: {
                claimsToAddOrOverride: {
                    'custom:organizationId': 'org-456',
                },
            },
        });
    });
});
