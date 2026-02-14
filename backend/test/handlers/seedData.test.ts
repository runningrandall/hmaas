import { vi, describe, it, expect, beforeEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { handler } from '../../src/handlers/seedData';

const ddbMock = mockClient(DynamoDBClient);

// Mock fetch for CloudFormation response
const mockFetch = vi.fn().mockResolvedValue({ status: 200 });
vi.stubGlobal('fetch', mockFetch);

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
        Version: '1',
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
        ddbMock.reset();
        vi.clearAllMocks();
        mockFetch.mockResolvedValue({ status: 200 });
    });

    it('should seed data on Create event', async () => {
        ddbMock.on(PutItemCommand).resolves({});

        await handler(makeEvent('Create') as any, makeContext() as any);

        // Should have called PutItem for each seed item (5 items)
        expect(ddbMock.calls()).toHaveLength(5);

        // Should have sent SUCCESS response to CloudFormation
        expect(mockFetch).toHaveBeenCalledTimes(1);
        const fetchCall = mockFetch.mock.calls[0];
        expect(fetchCall[0]).toBe('https://cloudformation-custom-resource-response.s3.amazonaws.com/test');
        const responseBody = JSON.parse(fetchCall[1].body);
        expect(responseBody.Status).toBe('SUCCESS');
    });

    it('should seed data on Update event', async () => {
        ddbMock.on(PutItemCommand).resolves({});

        await handler(makeEvent('Update') as any, makeContext() as any);

        expect(ddbMock.calls()).toHaveLength(5);

        const responseBody = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(responseBody.Status).toBe('SUCCESS');
    });

    it('should skip existing items without failing', async () => {
        const conditionalError = new Error('Condition not met');
        (conditionalError as any).name = 'ConditionalCheckFailedException';
        ddbMock.on(PutItemCommand).rejects(conditionalError);

        await handler(makeEvent('Create') as any, makeContext() as any);

        // Should still succeed — ConditionalCheckFailedException is caught
        const responseBody = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(responseBody.Status).toBe('SUCCESS');
    });

    it('should handle Delete event with no action', async () => {
        await handler(makeEvent('Delete') as any, makeContext() as any);

        // Should not call DynamoDB at all
        expect(ddbMock.calls()).toHaveLength(0);

        // Should still respond SUCCESS to CloudFormation
        const responseBody = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(responseBody.Status).toBe('SUCCESS');
    });

    it('should report FAILED status on unexpected error', async () => {
        ddbMock.on(PutItemCommand).rejects(new Error('Access Denied'));

        await handler(makeEvent('Create') as any, makeContext() as any);

        const responseBody = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(responseBody.Status).toBe('FAILED');
        expect(responseBody.Reason).toBe('Access Denied');
    });
});
