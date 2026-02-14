import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { expect, it, describe, beforeEach, vi, afterEach } from 'vitest';

const ddbMock = mockClient(DynamoDBDocumentClient);
const ebMock = mockClient(EventBridgeClient);

describe('createReport handler', () => {
    let handler: any;

    beforeEach(async () => {
        ddbMock.reset();
        ebMock.reset();
        vi.resetModules();
        process.env.REPORTS_TABLE = 'ReportsTable';
        process.env.EVENT_BUS_NAME = 'TestBus';
        vi.unstubAllGlobals(); // Reset fetch mocks

        handler = (await import('../../src/handlers/createReport')).handler;
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    const createEvent = (body: any): APIGatewayProxyEvent => ({
        body: JSON.stringify(body),
        headers: {},
        multiValueHeaders: {},
        httpMethod: 'POST',
        isBase64Encoded: false,
        path: '/reports',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: '',
    });

    it('should create a report and publish event', async () => {
        ddbMock.on(PutCommand).resolves({});
        ebMock.on(PutEventsCommand).resolves({ FailedEntryCount: 0 });

        const body = {
            concernType: 'Safety',
            location: { lat: 40, lng: -111 },
            description: 'Test Report',
        };

        const result = await handler(createEvent(body), {} as any, {} as any);

        expect(result.statusCode).toBe(201);
        const resBody = JSON.parse(result.body);
        expect(resBody.reportId).toBeDefined();

        // Verify DynamoDB Put
        expect(ddbMock.calls()).toHaveLength(1);
        const putInput = ddbMock.call(0).args[0].input;
        expect(putInput.TableName).toBe('ReportsTable');
        expect(putInput.Item?.type).toBe('REPORT'); // GSI Check
        expect(putInput.Item?.concernType).toBe('Safety');
        expect(putInput.Item?.status).toBe('NEW');

        // Verify EventBridge Put
        expect(ebMock.calls()).toHaveLength(1);
        const ebInput = ebMock.call(0).args[0].input;
        expect(ebInput.Entries).toHaveLength(1);
        expect(ebInput.Entries?.[0].DetailType).toBe('ReportCreated');
        const detail = JSON.parse(ebInput.Entries?.[0].Detail || '{}');
        expect(detail.reportId).toBe(resBody.reportId);
    });

    it('should return 400 if required fields are missing', async () => {
        const result = await handler(createEvent({}), {} as any, {} as any);
        expect(result.statusCode).toBe(400);
    });

    it('should verify recaptcha if secret key is present', async () => {
        process.env.RECAPTCHA_SECRET_KEY = 'secret';
        const fetchMock = vi.fn().mockResolvedValue({
            json: async () => ({ success: true }),
        } as Response);
        vi.stubGlobal('fetch', fetchMock);

        ddbMock.on(PutCommand).resolves({});
        ebMock.on(PutEventsCommand).resolves({});

        const body = {
            concernType: 'Safety',
            location: { lat: 40, lng: -111 },
            captchaToken: 'token',
        };

        const result = await handler(createEvent(body), {} as any, {} as any);

        expect(result.statusCode).toBe(201);
        expect(fetchMock).toHaveBeenCalled();
    });

    it('should fail if recaptcha fails', async () => {
        process.env.RECAPTCHA_SECRET_KEY = 'secret';
        const fetchMock = vi.fn().mockResolvedValue({
            json: async () => ({ success: false }),
        } as Response);
        vi.stubGlobal('fetch', fetchMock);

        const body = {
            concernType: 'Safety',
            location: { lat: 40, lng: -111 },
            captchaToken: 'bad-token',
        };

        const result = await handler(createEvent(body), {} as any, {} as any);

        expect(result.statusCode).toBe(400);
        expect(ddbMock.calls()).toHaveLength(0);
    });
});
