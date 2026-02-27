import { vi, describe, it, expect, beforeEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { VerifiedPermissionsClient, IsAuthorizedCommand, IsAuthorizedCommandInput } from '@aws-sdk/client-verifiedpermissions';
import { handler } from '../../src/auth/authorizer';

const avpMock = mockClient(VerifiedPermissionsClient);

// Use vi.hoisted so mocks are available before vi.mock hoisting
const { mockVerify } = vi.hoisted(() => ({
    mockVerify: vi.fn(),
}));

vi.mock('aws-jwt-verify', () => ({
    CognitoJwtVerifier: {
        create: vi.fn(() => ({
            verify: mockVerify,
        })),
    },
}));

const makeEvent = (overrides: Record<string, any> = {}) => ({
    type: 'TOKEN',
    authorizationToken: 'Bearer test-jwt-token',
    methodArn: 'arn:aws:execute-api:us-east-1:123456789:apiid/stage/GET/items',
    ...overrides,
});

describe('authorizer handler', () => {
    beforeEach(() => {
        avpMock.reset();
        vi.clearAllMocks();
    });

    it('should allow access when AVP returns ALLOW for GET', async () => {
        mockVerify.mockResolvedValue({
            sub: 'user-123',
            'cognito:groups': ['admin'],
            'custom:organizationId': 'org-abc',
        });
        avpMock.on(IsAuthorizedCommand).resolves({ decision: 'ALLOW' });

        const event = makeEvent();
        const result = await handler(event as any);

        expect(result.principalId).toBe('user-123');
        expect(result.policyDocument.Statement[0].Effect).toBe('Allow');
    });

    it('should include organizationId in authorizer context', async () => {
        mockVerify.mockResolvedValue({
            sub: 'user-123',
            'cognito:groups': ['admin'],
            'custom:organizationId': 'org-abc',
        });
        avpMock.on(IsAuthorizedCommand).resolves({ decision: 'ALLOW' });

        const event = makeEvent();
        const result = await handler(event as any);

        expect(result.context).toBeDefined();
        expect(result.context!.organizationId).toBe('org-abc');
    });

    it('should include empty organizationId when not in token', async () => {
        mockVerify.mockResolvedValue({
            sub: 'user-123',
            'cognito:groups': ['admin'],
        });
        avpMock.on(IsAuthorizedCommand).resolves({ decision: 'ALLOW' });

        const event = makeEvent();
        const result = await handler(event as any);

        expect(result.context!.organizationId).toBe('');
    });

    it('should pass organizationId to AVP entity attributes', async () => {
        mockVerify.mockResolvedValue({
            sub: 'user-123',
            'cognito:groups': ['admin'],
            'custom:organizationId': 'org-xyz',
        });
        avpMock.on(IsAuthorizedCommand).resolves({ decision: 'ALLOW' });

        const event = makeEvent();
        await handler(event as any);

        const callArgs = avpMock.call(0).args[0].input as IsAuthorizedCommandInput;
        expect(callArgs.entities?.entityList?.[0]?.attributes?.organizationId?.string).toBe('org-xyz');
    });

    it('should deny access when AVP returns DENY', async () => {
        mockVerify.mockResolvedValue({
            sub: 'user-456',
            'cognito:groups': ['user'],
            'custom:organizationId': 'org-abc',
        });
        avpMock.on(IsAuthorizedCommand).resolves({ decision: 'DENY' });

        const event = makeEvent();
        const result = await handler(event as any);

        expect(result.principalId).toBe('user-456');
        expect(result.policyDocument.Statement[0].Effect).toBe('Deny');
    });

    it('should map POST to ManageUsers action', async () => {
        mockVerify.mockResolvedValue({
            sub: 'user-789',
            'cognito:groups': ['admin'],
            'custom:organizationId': 'org-abc',
        });
        avpMock.on(IsAuthorizedCommand).resolves({ decision: 'ALLOW' });

        const event = makeEvent({
            methodArn: 'arn:aws:execute-api:us-east-1:123456789:apiid/stage/POST/items',
        });

        const result = await handler(event as any);
        expect(result.principalId).toBe('user-789');

        // Verify the AVP command was called with ManageUsers action
        expect(avpMock.calls()).toHaveLength(1);
        const callArgs = avpMock.call(0).args[0].input as IsAuthorizedCommandInput;
        expect(callArgs.action?.actionId).toBe('ManageUsers');
    });

    it('should map GET to ReadDashboard action', async () => {
        mockVerify.mockResolvedValue({
            sub: 'user-123',
            'cognito:groups': [],
        });
        avpMock.on(IsAuthorizedCommand).resolves({ decision: 'ALLOW' });

        const event = makeEvent({
            methodArn: 'arn:aws:execute-api:us-east-1:123456789:apiid/stage/GET/items/123',
        });

        await handler(event as any);

        const callArgs = avpMock.call(0).args[0].input as IsAuthorizedCommandInput;
        expect(callArgs.action?.actionId).toBe('ReadDashboard');
    });

    it('should map organizations routes to ManageOrganizations action', async () => {
        mockVerify.mockResolvedValue({
            sub: 'user-123',
            'cognito:groups': ['SuperAdmin'],
            'custom:organizationId': '',
        });
        avpMock.on(IsAuthorizedCommand).resolves({ decision: 'ALLOW' });

        const event = makeEvent({
            methodArn: 'arn:aws:execute-api:us-east-1:123456789:apiid/stage/GET/organizations',
        });

        await handler(event as any);

        const callArgs = avpMock.call(0).args[0].input as IsAuthorizedCommandInput;
        expect(callArgs.action?.actionId).toBe('ManageOrganizations');
    });

    it('should map organizations config routes to ManageOrgConfig action', async () => {
        mockVerify.mockResolvedValue({
            sub: 'user-123',
            'cognito:groups': ['SuperAdmin'],
            'custom:organizationId': 'org-abc',
        });
        avpMock.on(IsAuthorizedCommand).resolves({ decision: 'ALLOW' });

        const event = makeEvent({
            methodArn: 'arn:aws:execute-api:us-east-1:123456789:apiid/stage/PUT/organizations/org-abc/config',
        });

        await handler(event as any);

        const callArgs = avpMock.call(0).args[0].input as IsAuthorizedCommandInput;
        expect(callArgs.action?.actionId).toBe('ManageOrgConfig');
    });

    it('should map organizations secrets routes to ManageOrgSecrets action', async () => {
        mockVerify.mockResolvedValue({
            sub: 'user-123',
            'cognito:groups': ['SuperAdmin'],
            'custom:organizationId': 'org-abc',
        });
        avpMock.on(IsAuthorizedCommand).resolves({ decision: 'ALLOW' });

        const event = makeEvent({
            methodArn: 'arn:aws:execute-api:us-east-1:123456789:apiid/stage/GET/organizations/org-abc/secrets',
        });

        await handler(event as any);

        const callArgs = avpMock.call(0).args[0].input as IsAuthorizedCommandInput;
        expect(callArgs.action?.actionId).toBe('ManageOrgSecrets');
    });

    it('should handle users with no groups', async () => {
        mockVerify.mockResolvedValue({
            sub: 'user-no-groups',
            // No cognito:groups in payload
        });
        avpMock.on(IsAuthorizedCommand).resolves({ decision: 'ALLOW' });

        const event = makeEvent();
        const result = await handler(event as any);

        expect(result.principalId).toBe('user-no-groups');
        expect(result.policyDocument.Statement[0].Effect).toBe('Allow');

        // Should pass empty groups array
        const callArgs = avpMock.call(0).args[0].input as IsAuthorizedCommandInput;
        expect(callArgs.entities?.entityList?.[0]?.attributes?.groups?.set).toEqual([]);
    });

    it('should throw Unauthorized on invalid token', async () => {
        mockVerify.mockRejectedValue(new Error('Token expired'));

        const event = makeEvent();

        await expect(handler(event as any)).rejects.toThrow('Unauthorized');
    });

    it('should throw Unauthorized on AVP client error', async () => {
        mockVerify.mockResolvedValue({
            sub: 'user-123',
            'cognito:groups': ['admin'],
        });
        avpMock.on(IsAuthorizedCommand).rejects(new Error('AVP service error'));

        const event = makeEvent();

        await expect(handler(event as any)).rejects.toThrow('Unauthorized');
    });
});
