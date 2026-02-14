import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { expect, it, describe, beforeEach, vi, afterEach } from 'vitest';

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('listReports handler', () => {
    let handler: any;

    beforeEach(async () => {
        ddbMock.reset();
        vi.resetModules();
        process.env.REPORTS_TABLE = 'TestTable';
        // Dynamic import to ensure process.env is read correctly
        handler = (await import('../../src/handlers/listReports')).handler;
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    const createEvent = (queryParams: Record<string, string> | null = null): APIGatewayProxyEvent => ({
        queryStringParameters: queryParams,
        body: null,
        headers: {},
        multiValueHeaders: {},
        httpMethod: 'GET',
        isBase64Encoded: false,
        path: '/reports',
        pathParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: '',
    });

    it('should query reports using GSI ByDate', async () => {
        ddbMock.on(QueryCommand).resolves({
            Items: [{ reportId: '1', type: 'REPORT', createdAt: '2024-01-01' }],
        });

        const result = await handler(createEvent(), {} as any, {} as any);

        expect(result.statusCode).toBe(200);
        const body = JSON.parse(result.body);
        expect(body.items).toHaveLength(1);
        expect(body.items[0].reportId).toBe('1');

        expect(ddbMock.calls()).toHaveLength(1);
        const input = ddbMock.call(0).args[0].input;
        expect(input.TableName).toBe('TestTable');
        expect(input.IndexName).toBe('ByDate');
        expect(input.KeyConditionExpression).toBe('#type = :type');
        expect(input.ExpressionAttributeValues?.[':type']).toBe('REPORT');
        expect(input.ScanIndexForward).toBe(false); // Descending
    });

    it('should handle pagination with limit and nextToken', async () => {
        ddbMock.on(QueryCommand).resolves({
            Items: [],
            LastEvaluatedKey: { reportId: 'last-id', type: 'REPORT', createdAt: '2024-01-01' },
        });

        const nextTokenIn = Buffer.from(JSON.stringify({ reportId: 'prev-id' })).toString('base64');
        const event = createEvent({ limit: '10', nextToken: nextTokenIn });

        const result = await handler(event, {} as any, {} as any);

        const body = JSON.parse(result.body);
        expect(body.nextToken).toBeDefined();

        const input = ddbMock.call(0).args[0].input;
        expect(input.Limit).toBe(10);
        expect(input.ExclusiveStartKey).toEqual({ reportId: 'prev-id' });
    });

    it('should applying search filter', async () => {
        ddbMock.on(QueryCommand).resolves({ Items: [] });

        const event = createEvent({ search: 'Bear' });
        await handler(event, {} as any, {} as any);

        const input = ddbMock.call(0).args[0].input;
        expect(input.FilterExpression).toContain('contains(#name, :search)');
        expect(input.ExpressionAttributeValues?.[':search']).toBe('bear'); // Lowercase
    });

    it('should handle errors gracefully', async () => {
        ddbMock.on(QueryCommand).rejects(new Error('DynamoDB Error'));

        const result = await handler(createEvent(), {} as any, {} as any);

        expect(result.statusCode).toBe(500);
        const body = JSON.parse(result.body);
        expect(body.message).toBe('Internal Server Error');
    });
});
