import { APIGatewayProxyEvent } from 'aws-lambda';

export const DEFAULT_ORG_ID = 'org-test-123';

/**
 * Creates a minimal APIGatewayProxyEvent for POST/CREATE handlers.
 */
export function makeCreateEvent(body: Record<string, unknown>, pathParameters?: Record<string, string>): APIGatewayProxyEvent {
    const event = {
        body: JSON.stringify(body),
        headers: { 'content-type': 'application/json' },
        multiValueHeaders: {},
        httpMethod: 'POST',
        isBase64Encoded: false,
        path: '/',
        pathParameters: pathParameters || null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: { authorizer: { organizationId: DEFAULT_ORG_ID } } as any,
        resource: '',
    } as APIGatewayProxyEvent;
    (event as any).organizationId = DEFAULT_ORG_ID;
    return event;
}

/**
 * Creates a minimal APIGatewayProxyEvent for GET handlers (by ID).
 */
export function makeGetEvent(pathParameters: Record<string, string>): APIGatewayProxyEvent {
    const event = {
        body: null,
        headers: { 'content-type': 'application/json' },
        multiValueHeaders: {},
        httpMethod: 'GET',
        isBase64Encoded: false,
        path: '/',
        pathParameters,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: { authorizer: { organizationId: DEFAULT_ORG_ID } } as any,
        resource: '',
    } as APIGatewayProxyEvent;
    (event as any).organizationId = DEFAULT_ORG_ID;
    return event;
}

/**
 * Creates a minimal APIGatewayProxyEvent for LIST handlers with optional pagination.
 */
export function makeListEvent(
    queryStringParameters?: Record<string, string> | null,
    pathParameters?: Record<string, string> | null,
): APIGatewayProxyEvent {
    const event = {
        body: null,
        headers: { 'content-type': 'application/json' },
        multiValueHeaders: {},
        httpMethod: 'GET',
        isBase64Encoded: false,
        path: '/',
        pathParameters: pathParameters || null,
        queryStringParameters: queryStringParameters || null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: { authorizer: { organizationId: DEFAULT_ORG_ID } } as any,
        resource: '',
    } as APIGatewayProxyEvent;
    (event as any).organizationId = DEFAULT_ORG_ID;
    return event;
}

/**
 * Creates a minimal APIGatewayProxyEvent for PUT/UPDATE handlers.
 */
export function makeUpdateEvent(pathParameters: Record<string, string>, body: Record<string, unknown>): APIGatewayProxyEvent {
    const event = {
        body: JSON.stringify(body),
        headers: { 'content-type': 'application/json' },
        multiValueHeaders: {},
        httpMethod: 'PUT',
        isBase64Encoded: false,
        path: '/',
        pathParameters,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: { authorizer: { organizationId: DEFAULT_ORG_ID } } as any,
        resource: '',
    } as APIGatewayProxyEvent;
    (event as any).organizationId = DEFAULT_ORG_ID;
    return event;
}

/**
 * Creates a minimal APIGatewayProxyEvent for DELETE handlers.
 */
export function makeDeleteEvent(pathParameters: Record<string, string>): APIGatewayProxyEvent {
    const event = {
        body: null,
        headers: { 'content-type': 'application/json' },
        multiValueHeaders: {},
        httpMethod: 'DELETE',
        isBase64Encoded: false,
        path: '/',
        pathParameters,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: { authorizer: { organizationId: DEFAULT_ORG_ID } } as any,
        resource: '',
    } as APIGatewayProxyEvent;
    (event as any).organizationId = DEFAULT_ORG_ID;
    return event;
}

/** Shared mock context for Lambda handlers */
export const mockContext = {} as any;

/** Standard observability mock factory for vi.mock() */
export function makeObservabilityMock() {
    return {
        logger: {
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            debug: vi.fn(),
            addContext: vi.fn(),
        },
        tracer: { captureAWSv3Client: (c: any) => c },
        metrics: { addMetric: vi.fn() },
    };
}
