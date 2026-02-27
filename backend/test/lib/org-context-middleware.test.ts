import { describe, it, expect, vi, beforeEach } from 'vitest';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { orgContextMiddleware } from '../../src/lib/org-context-middleware';
import { AppError } from '../../src/lib/error';

/** Minimal valid APIGatewayProxyEvent factory */
function makeEvent(overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent {
    return {
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
        requestContext: { requestId: 'test-request-id' } as any,
        resource: '',
        ...overrides,
    };
}

/** Builds a minimal middy request object wrapping the given event */
function makeRequest(event: APIGatewayProxyEvent) {
    return {
        event,
        context: {} as any,
        response: null as any,
        error: null as any,
        internal: {},
    };
}

describe('orgContextMiddleware', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should extract organizationId from requestContext.authorizer.organizationId', async () => {
        const event = makeEvent({
            requestContext: {
                requestId: 'test-request-id',
                authorizer: { organizationId: 'org-from-authorizer' },
            } as any,
        });
        const request = makeRequest(event);

        const middleware = orgContextMiddleware();
        await middleware.before!(request as any);

        expect((request.event as any).organizationId).toBe('org-from-authorizer');
    });

    it('should fall back to x-organization-id header when authorizer does not provide organizationId', async () => {
        const event = makeEvent({
            headers: { 'x-organization-id': 'org-from-header' },
            requestContext: { requestId: 'test-request-id' } as any,
        });
        const request = makeRequest(event);

        const middleware = orgContextMiddleware();
        await middleware.before!(request as any);

        expect((request.event as any).organizationId).toBe('org-from-header');
    });

    it('should prefer authorizer organizationId over x-organization-id header', async () => {
        const event = makeEvent({
            headers: { 'x-organization-id': 'org-from-header' },
            requestContext: {
                requestId: 'test-request-id',
                authorizer: { organizationId: 'org-from-authorizer' },
            } as any,
        });
        const request = makeRequest(event);

        const middleware = orgContextMiddleware();
        await middleware.before!(request as any);

        expect((request.event as any).organizationId).toBe('org-from-authorizer');
    });

    it('should throw AppError with 403 when neither authorizer nor header provides organizationId', async () => {
        const event = makeEvent({
            headers: {},
            requestContext: { requestId: 'test-request-id' } as any,
        });
        const request = makeRequest(event);

        const middleware = orgContextMiddleware();

        await expect(middleware.before!(request as any)).rejects.toThrow(AppError);
        await expect(middleware.before!(request as any)).rejects.toMatchObject({
            statusCode: 403,
            code: 'FORBIDDEN',
            message: 'Missing organizationId in request context',
        });
    });

    it('should throw AppError with 403 when authorizer exists but organizationId is missing', async () => {
        const event = makeEvent({
            requestContext: {
                requestId: 'test-request-id',
                authorizer: { principalId: 'user-123' },
            } as any,
        });
        const request = makeRequest(event);

        const middleware = orgContextMiddleware();

        await expect(middleware.before!(request as any)).rejects.toThrow(AppError);
        await expect(middleware.before!(request as any)).rejects.toMatchObject({
            statusCode: 403,
        });
    });

    it('should set organizationId directly on the event object', async () => {
        const event = makeEvent({
            requestContext: {
                requestId: 'test-request-id',
                authorizer: { organizationId: 'org-abc-123' },
            } as any,
        });
        const request = makeRequest(event);

        const middleware = orgContextMiddleware();
        await middleware.before!(request as any);

        // Verify the property is set directly on the event
        expect(request.event).toHaveProperty('organizationId', 'org-abc-123');
    });
});
