import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock fetch for CloudFormation response
const mockFetch = vi.fn().mockResolvedValue({ status: 200 });
vi.stubGlobal('fetch', mockFetch);

const mockPut = vi.fn().mockReturnValue({ go: vi.fn().mockResolvedValue({}) });

vi.mock('../../src/entities/property-type', () => ({
    PropertyTypeEntity: { put: (...args: any[]) => mockPut(...args) },
}));

vi.mock('../../src/entities/service-type', () => ({
    ServiceTypeEntity: { put: (...args: any[]) => mockPut(...args) },
}));

vi.mock('../../src/entities/cost-type', () => ({
    CostTypeEntity: { put: (...args: any[]) => mockPut(...args) },
}));

vi.mock('../../src/entities/organization', () => ({
    OrganizationEntity: { put: (...args: any[]) => mockPut(...args) },
}));

vi.mock('../../src/clients/dynamodb', () => ({
    client: {},
}));

import { handler } from '../../src/handlers/seedData';

const makeEvent = (requestType: string) => ({
    RequestType: requestType,
    ServiceToken: 'arn:aws:lambda:us-east-1:123456789:function:seed',
    ResponseURL: 'https://cloudformation-custom-resource-response.s3.amazonaws.com/test',
    StackId: 'arn:aws:cloudformation:us-east-1:123456789:stack/test/guid',
    RequestId: 'test-request-id',
    ResourceType: 'Custom::SeedData',
    LogicalResourceId: 'SeedDataResource',
    ResourceProperties: {
        ServiceToken: 'arn:aws:lambda:us-east-1:123456789:function:seed',
        Version: '2',
    },
});

const makeContext = () => ({
    logStreamName: 'test-log-stream',
    callbackWaitsForEmptyEventLoop: true,
    functionName: 'seed',
    functionVersion: '$LATEST',
    invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789:function:seed',
    memoryLimitInMB: '128',
    awsRequestId: 'test-request-id',
    logGroupName: '/aws/lambda/seed',
    getRemainingTimeInMillis: () => 30000,
    done: vi.fn(),
    fail: vi.fn(),
    succeed: vi.fn(),
});

describe('seedData handler', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockPut.mockReturnValue({ go: vi.fn().mockResolvedValue({}) });
        mockFetch.mockResolvedValue({ status: 200 });
    });

    it('should seed data on Create event', async () => {
        await handler(makeEvent('Create') as any, makeContext() as any);

        // 18 items: 1 org + 2 property types + 10 service types + 5 cost types
        expect(mockPut).toHaveBeenCalledTimes(18);

        // Should have sent SUCCESS response to CloudFormation
        expect(mockFetch).toHaveBeenCalledTimes(1);
        const fetchCall = mockFetch.mock.calls[0];
        expect(fetchCall[0]).toBe('https://cloudformation-custom-resource-response.s3.amazonaws.com/test');
        const responseBody = JSON.parse(fetchCall[1].body);
        expect(responseBody.Status).toBe('SUCCESS');
        expect(responseBody.Data.SeededCount).toBe(18);
    });

    it('should seed data on Update event', async () => {
        await handler(makeEvent('Update') as any, makeContext() as any);

        expect(mockPut).toHaveBeenCalledTimes(18);

        const responseBody = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(responseBody.Status).toBe('SUCCESS');
    });

    it('should seed default organization with correct data', async () => {
        await handler(makeEvent('Create') as any, makeContext() as any);

        // First call should be the default organization
        const orgCall = mockPut.mock.calls[0][0];
        expect(orgCall.organizationId).toBe('versa-default');
        expect(orgCall.name).toBe('Versa Property Management');
        expect(orgCall.slug).toBe('versa');
        expect(orgCall.billingEmail).toBe('admin@versapm.com');
    });

    it('should seed lookup entities with GLOBAL organizationId', async () => {
        await handler(makeEvent('Create') as any, makeContext() as any);

        // Skip first call (org), check property types and service types use GLOBAL
        for (let i = 1; i < mockPut.mock.calls.length; i++) {
            const itemData = mockPut.mock.calls[i][0];
            expect(itemData.organizationId).toBe('GLOBAL');
        }
    });

    it('should handle Delete event with no action', async () => {
        await handler(makeEvent('Delete') as any, makeContext() as any);

        // Should not call put at all
        expect(mockPut).not.toHaveBeenCalled();

        // Should still respond SUCCESS to CloudFormation
        const responseBody = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(responseBody.Status).toBe('SUCCESS');
    });

    it('should report FAILED status on unexpected error', async () => {
        mockPut.mockReturnValue({ go: vi.fn().mockRejectedValue(new Error('Access Denied')) });

        await handler(makeEvent('Create') as any, makeContext() as any);

        const responseBody = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(responseBody.Status).toBe('FAILED');
        expect(responseBody.Reason).toBe('Access Denied');
    });

    it('should skip items that already exist', async () => {
        const conditionalError = new Error('The conditional request failed - conditional');
        mockPut.mockReturnValue({ go: vi.fn().mockRejectedValue(conditionalError) });

        await handler(makeEvent('Create') as any, makeContext() as any);

        // Should still succeed — conditional errors are caught
        const responseBody = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(responseBody.Status).toBe('SUCCESS');
    });
});
