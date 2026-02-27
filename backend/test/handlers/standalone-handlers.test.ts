import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { APIGatewayProxyEvent } from 'aws-lambda';

vi.mock('../../src/lib/observability', () => ({
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

// Mock @aws-sdk/s3-request-presigner since it requires real credentials
vi.mock('@aws-sdk/s3-request-presigner', () => ({
    getSignedUrl: vi.fn().mockResolvedValue('https://presigned.url/test-key'),
}));

const ddbMock = mockClient(DynamoDBDocumentClient);
const s3Mock = mockClient(S3Client);
const sesMock = mockClient(SESClient);

const makeApiEvent = (overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent => ({
    body: null,
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'GET',
    isBase64Encoded: false,
    path: '/',
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {} as any,
    resource: '',
    ...overrides,
});

describe('getReport handler', () => {
    let handler: any;

    beforeEach(async () => {
        ddbMock.reset();
        s3Mock.reset();
        vi.resetModules();
        vi.mock('@aws-sdk/s3-request-presigner', () => ({
            getSignedUrl: vi.fn().mockResolvedValue('https://presigned.url/test-key'),
        }));
        process.env.REPORTS_TABLE = 'ReportsTable';
        process.env.BUCKET_NAME = 'TestBucket';
        handler = (await import('../../src/handlers/getReport')).handler;
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('should return 400 when reportId is missing', async () => {
        const event = makeApiEvent();
        const result = await handler(event, {} as any, {} as any);

        expect(result.statusCode).toBe(400);
        const body = JSON.parse(result.body);
        expect(body.message).toBe('Missing reportId');
    });

    it('should return 404 when report is not found', async () => {
        ddbMock.on(GetCommand).resolves({ Item: undefined });

        const event = makeApiEvent({ pathParameters: { reportId: 'report-999' } });
        const result = await handler(event, {} as any, {} as any);

        expect(result.statusCode).toBe(404);
        const body = JSON.parse(result.body);
        expect(body.message).toBe('Report not found');
    });

    it('should return 200 with report when found', async () => {
        ddbMock.on(GetCommand).resolves({
            Item: {
                reportId: 'report-123',
                concernType: 'Safety',
                description: 'Test',
                imageKeys: [],
            },
        });

        const event = makeApiEvent({ pathParameters: { reportId: 'report-123' } });
        const result = await handler(event, {} as any, {} as any);

        expect(result.statusCode).toBe(200);
        const body = JSON.parse(result.body);
        expect(body.reportId).toBe('report-123');
        expect(body.imageUrls).toEqual([]);
    });

    it('should return 500 when DynamoDB throws an error', async () => {
        ddbMock.on(GetCommand).rejects(new Error('DynamoDB error'));

        const event = makeApiEvent({ pathParameters: { reportId: 'report-123' } });
        const result = await handler(event, {} as any, {} as any);

        expect(result.statusCode).toBe(500);
        const body = JSON.parse(result.body);
        expect(body.message).toBe('Internal Server Error');
    });
});

describe('generateUploadUrl handler', () => {
    let handler: any;

    beforeEach(async () => {
        s3Mock.reset();
        vi.resetModules();
        vi.mock('@aws-sdk/s3-request-presigner', () => ({
            getSignedUrl: vi.fn().mockResolvedValue('https://presigned.url/uploads/uuid.jpeg'),
        }));
        process.env.BUCKET_NAME = 'TestBucket';
        handler = (await import('../../src/handlers/generateUploadUrl')).handler;
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('should return 200 with uploadUrl and key for default image type', async () => {
        const event = makeApiEvent();
        const result = await handler(event, {} as any, {} as any);

        expect(result.statusCode).toBe(200);
        const body = JSON.parse(result.body);
        expect(body.uploadUrl).toBeDefined();
        expect(body.key).toMatch(/^uploads\/.+\.jpeg$/);
    });

    it('should return 200 with uploadUrl and key for specified image content type', async () => {
        const event = makeApiEvent({ queryStringParameters: { contentType: 'image/png' } });
        const result = await handler(event, {} as any, {} as any);

        expect(result.statusCode).toBe(200);
        const body = JSON.parse(result.body);
        expect(body.uploadUrl).toBeDefined();
        expect(body.key).toMatch(/^uploads\/.+\.png$/);
    });

    it('should return 400 when content type is not an image', async () => {
        const event = makeApiEvent({ queryStringParameters: { contentType: 'application/pdf' } });
        const result = await handler(event, {} as any, {} as any);

        expect(result.statusCode).toBe(400);
        const body = JSON.parse(result.body);
        expect(body.message).toBe('Invalid content type. Must be an image.');
    });
});

describe('processEvent handler', () => {
    let handler: any;

    beforeEach(async () => {
        vi.resetModules();
        handler = (await import('../../src/handlers/processEvent')).handler;
    });

    const makeEventBridgeEvent = (source: string, detailType: string, detail: Record<string, unknown> = {}) => ({
        source,
        'detail-type': detailType,
        detail,
        version: '0',
        id: 'event-id',
        account: '123456789012',
        time: '2026-01-01T00:00:00Z',
        region: 'us-east-1',
        resources: [],
    });

    it('should return without error for CustomerCreated event from versa.api', async () => {
        const event = makeEventBridgeEvent('versa.api', 'CustomerCreated', { customerId: 'cust-123' });
        await expect(handler(event)).resolves.toBeUndefined();
    });

    it('should return without error for CustomerStatusChanged event from versa.api', async () => {
        const event = makeEventBridgeEvent('versa.api', 'CustomerStatusChanged', { customerId: 'cust-123', status: 'inactive' });
        await expect(handler(event)).resolves.toBeUndefined();
    });

    it('should return without error for PropertyCreated event from versa.api', async () => {
        const event = makeEventBridgeEvent('versa.api', 'PropertyCreated', { propertyId: 'prop-123' });
        await expect(handler(event)).resolves.toBeUndefined();
    });

    it('should return without error for PropertyServiceActivated event from versa.api', async () => {
        const event = makeEventBridgeEvent('versa.api', 'PropertyServiceActivated', { serviceId: 'svc-123' });
        await expect(handler(event)).resolves.toBeUndefined();
    });

    it('should return without error for ServiceScheduleCreated event from versa.api', async () => {
        const event = makeEventBridgeEvent('versa.api', 'ServiceScheduleCreated', { scheduleId: 'sched-123' });
        await expect(handler(event)).resolves.toBeUndefined();
    });

    it('should return without error for InvoiceCreated event from versa.api', async () => {
        const event = makeEventBridgeEvent('versa.api', 'InvoiceCreated', { invoiceId: 'inv-123' });
        await expect(handler(event)).resolves.toBeUndefined();
    });

    it('should return without error for InvoicePaid event from versa.api', async () => {
        const event = makeEventBridgeEvent('versa.api', 'InvoicePaid', { invoiceId: 'inv-123' });
        await expect(handler(event)).resolves.toBeUndefined();
    });

    it('should return without error for unknown event type from versa.api', async () => {
        const event = makeEventBridgeEvent('versa.api', 'SomeOtherEvent', { data: 'value' });
        await expect(handler(event)).resolves.toBeUndefined();
    });

    it('should warn and return for events from unexpected source', async () => {
        const event = makeEventBridgeEvent('other.source', 'CustomerCreated', {});
        await expect(handler(event)).resolves.toBeUndefined();
    });
});

describe('sendReportNotification handler', () => {
    let handler: any;

    beforeEach(async () => {
        sesMock.reset();
        vi.resetModules();
        process.env.SENDER_EMAIL = 'sender@example.com';
        process.env.RECIPIENT_EMAIL = 'admin@example.com';
        process.env.FRONTEND_URL = 'https://app.example.com';
        handler = (await import('../../src/handlers/sendReportNotification')).handler;
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    const makeReportCreatedEvent = (detail: Record<string, unknown>) => ({
        source: 'versa.api',
        'detail-type': 'ReportCreated' as const,
        detail,
        version: '0',
        id: 'event-id',
        account: '123456789012',
        time: '2026-01-01T00:00:00Z',
        region: 'us-east-1',
        resources: [],
    });

    it('should send email when ReportCreated event is received', async () => {
        sesMock.on(SendEmailCommand).resolves({});

        const event = makeReportCreatedEvent({
            reportId: 'report-123',
            description: 'Pothole on Main St',
            location: { lat: 40.7128, lng: -74.0060 },
        });

        await expect(handler(event)).resolves.toBeUndefined();
        expect(sesMock.calls()).toHaveLength(1);

        const sesInput = sesMock.call(0).args[0].input;
        expect(sesInput.Source).toBe('sender@example.com');
        expect(sesInput.Destination?.ToAddresses).toContain('admin@example.com');
        expect(sesInput.Message?.Subject?.Data).toContain('report-123');
    });

    it('should throw when SENDER_EMAIL is missing', async () => {
        delete process.env.SENDER_EMAIL;
        vi.resetModules();
        handler = (await import('../../src/handlers/sendReportNotification')).handler;

        const event = makeReportCreatedEvent({ reportId: 'report-123' });
        await expect(handler(event)).rejects.toThrow('Missing email configuration');
    });

    it('should throw when RECIPIENT_EMAIL is missing', async () => {
        delete process.env.RECIPIENT_EMAIL;
        vi.resetModules();
        handler = (await import('../../src/handlers/sendReportNotification')).handler;

        const event = makeReportCreatedEvent({ reportId: 'report-123' });
        await expect(handler(event)).rejects.toThrow('Missing email configuration');
    });

    it('should throw when SES send fails', async () => {
        sesMock.on(SendEmailCommand).rejects(new Error('SES error'));

        const event = makeReportCreatedEvent({
            reportId: 'report-123',
            description: 'Test',
        });

        await expect(handler(event)).rejects.toThrow('SES error');
    });

    it('should include location coordinates in email when location is provided', async () => {
        sesMock.on(SendEmailCommand).resolves({});

        const event = makeReportCreatedEvent({
            reportId: 'report-456',
            description: 'Test description',
            location: { lat: 37.7749, lng: -122.4194 },
            locationDescription: 'Near the park',
        });

        await handler(event);

        const sesInput = sesMock.call(0).args[0].input;
        const emailBody = sesInput.Message?.Body?.Html?.Data || '';
        expect(emailBody).toContain('37.7749');
        expect(emailBody).toContain('-122.4194');
    });
});
