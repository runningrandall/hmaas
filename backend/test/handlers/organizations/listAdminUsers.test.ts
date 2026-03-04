import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeListEvent, mockContext } from '../../helpers/test-utils';

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

const mockListAdminUsers = vi.fn();

vi.mock('../../../src/adapters/cognito-user-provider', () => ({
    CognitoUserProviderAdapter: vi.fn().mockImplementation(function () {
        return { listAdminUsers: mockListAdminUsers };
    }),
}));

describe('listAdminUsers handler', () => {
    let handler: any;

    beforeEach(async () => {
        vi.clearAllMocks();
        handler = (await import('../../../src/handlers/organizations/listAdminUsers')).handler;
    });

    it('should return 200 with admin users', async () => {
        const mockUsers = [
            { userId: 'user-1', email: 'admin@test.com', name: 'Admin', groups: ['SuperAdmin'] },
            { userId: 'user-2', email: 'manager@test.com', groups: ['Manager'] },
        ];
        mockListAdminUsers.mockResolvedValue(mockUsers);

        const event = makeListEvent();
        const result = await handler(event, mockContext);

        expect(result.statusCode).toBe(200);
        const body = JSON.parse(result.body);
        expect(body).toHaveLength(2);
        expect(body[0].userId).toBe('user-1');
    });

    it('should return empty array when no admin users', async () => {
        mockListAdminUsers.mockResolvedValue([]);

        const event = makeListEvent();
        const result = await handler(event, mockContext);

        expect(result.statusCode).toBe(200);
        const body = JSON.parse(result.body);
        expect(body).toHaveLength(0);
    });
});
