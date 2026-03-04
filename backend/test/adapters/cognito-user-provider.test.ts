import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/observability', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), addContext: vi.fn() },
    tracer: { captureAWSv3Client: (c: any) => c },
    metrics: { addMetric: vi.fn() },
}));

const mockSend = vi.fn();

vi.mock('@aws-sdk/client-cognito-identity-provider', () => ({
    CognitoIdentityProviderClient: vi.fn().mockImplementation(function () { return { send: mockSend }; }),
    ListUsersInGroupCommand: vi.fn().mockImplementation(function (params: any) { return params; }),
}));

import { CognitoUserProviderAdapter } from '../../src/adapters/cognito-user-provider';

describe('CognitoUserProviderAdapter', () => {
    let adapter: CognitoUserProviderAdapter;

    beforeEach(() => {
        vi.clearAllMocks();
        adapter = new CognitoUserProviderAdapter('us-east-1_test');
    });

    it('should return users from all admin groups', async () => {
        mockSend
            .mockResolvedValueOnce({
                Users: [
                    { Attributes: [{ Name: 'sub', Value: 'user-1' }, { Name: 'email', Value: 'admin@test.com' }, { Name: 'name', Value: 'Admin User' }] },
                ],
            })
            .mockResolvedValueOnce({
                Users: [
                    { Attributes: [{ Name: 'sub', Value: 'user-2' }, { Name: 'email', Value: 'manager@test.com' }] },
                ],
            })
            .mockResolvedValueOnce({
                Users: [],
            });

        const users = await adapter.listAdminUsers();

        expect(users).toHaveLength(2);
        expect(users[0]).toEqual({
            userId: 'user-1',
            email: 'admin@test.com',
            name: 'Admin User',
            groups: ['SuperAdmin'],
        });
        expect(users[1]).toEqual({
            userId: 'user-2',
            email: 'manager@test.com',
            name: undefined,
            groups: ['Admin'],
        });
    });

    it('should de-duplicate users across groups', async () => {
        const sharedUser = { Attributes: [{ Name: 'sub', Value: 'user-1' }, { Name: 'email', Value: 'admin@test.com' }] };

        mockSend
            .mockResolvedValueOnce({ Users: [sharedUser] })
            .mockResolvedValueOnce({ Users: [sharedUser] })
            .mockResolvedValueOnce({ Users: [] });

        const users = await adapter.listAdminUsers();

        expect(users).toHaveLength(1);
        expect(users[0].groups).toEqual(['SuperAdmin', 'Admin']);
    });

    it('should return empty array when no users found', async () => {
        mockSend
            .mockResolvedValueOnce({ Users: [] })
            .mockResolvedValueOnce({ Users: [] })
            .mockResolvedValueOnce({ Users: [] });

        const users = await adapter.listAdminUsers();

        expect(users).toHaveLength(0);
    });

    it('should skip users without sub attribute', async () => {
        mockSend
            .mockResolvedValueOnce({
                Users: [{ Attributes: [{ Name: 'email', Value: 'no-sub@test.com' }] }],
            })
            .mockResolvedValueOnce({ Users: [] })
            .mockResolvedValueOnce({ Users: [] });

        const users = await adapter.listAdminUsers();

        expect(users).toHaveLength(0);
    });

    it('should handle errors gracefully and continue', async () => {
        mockSend
            .mockRejectedValueOnce(new Error('Cognito error'))
            .mockResolvedValueOnce({
                Users: [{ Attributes: [{ Name: 'sub', Value: 'user-1' }, { Name: 'email', Value: 'admin@test.com' }] }],
            })
            .mockResolvedValueOnce({ Users: [] });

        const users = await adapter.listAdminUsers();

        expect(users).toHaveLength(1);
    });

    it('should handle pagination', async () => {
        mockSend
            .mockResolvedValueOnce({
                Users: [{ Attributes: [{ Name: 'sub', Value: 'user-1' }, { Name: 'email', Value: 'a@test.com' }] }],
                NextToken: 'page2',
            })
            .mockResolvedValueOnce({
                Users: [{ Attributes: [{ Name: 'sub', Value: 'user-2' }, { Name: 'email', Value: 'b@test.com' }] }],
            })
            .mockResolvedValueOnce({ Users: [] })
            .mockResolvedValueOnce({ Users: [] });

        const users = await adapter.listAdminUsers();

        expect(users).toHaveLength(2);
        expect(mockSend).toHaveBeenCalledTimes(4);
    });
});
