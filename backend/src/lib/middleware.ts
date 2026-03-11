import middy from '@middy/core';
import jsonBodyParser from '@middy/http-json-body-parser';
import httpHeaderNormalizer from '@middy/http-header-normalizer';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { logMetrics } from '@aws-lambda-powertools/metrics/middleware';
import { metrics } from './observability';
import { mapErrorToResponse } from './error';
import { orgContextMiddleware } from './org-context-middleware';

const ALLOWED_ORIGINS = ['http://localhost:3000'];
const ALLOWED_ORIGIN_PATTERN = /^https:\/\/([a-z0-9-]+\.)*vproservices\.com$/;

const isAllowedOrigin = (origin: string): boolean =>
    ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGIN_PATTERN.test(origin);

const corsMiddleware = (): middy.MiddlewareObj<APIGatewayProxyEvent, APIGatewayProxyResult> => {
    const applyHeaders = (request: middy.Request<APIGatewayProxyEvent, APIGatewayProxyResult>) => {
        const origin = request.event.headers?.origin || '';
        if (isAllowedOrigin(origin)) {
            request.response = request.response || {} as APIGatewayProxyResult;
            request.response.headers = {
                ...request.response.headers,
                'Access-Control-Allow-Origin': origin,
                'Vary': 'Origin',
            };
        }
    };

    return {
        after: async (request) => applyHeaders(request),
        onError: async (request) => applyHeaders(request),
    };
};

/**
 * Custom middy error handler that maps all errors through the centralized
 * error mapper to produce consistent ErrorResponse shapes.
 */
const errorHandlerMiddleware = (): middy.MiddlewareObj<APIGatewayProxyEvent, APIGatewayProxyResult> => ({
    onError: async (request) => {
        const requestId = request.event?.requestContext?.requestId;
        request.response = mapErrorToResponse(request.error, requestId);
    },
});

/**
 * Extracts organizationId from the event. The orgContextMiddleware sets
 * this on the event before the handler runs, so this is the primary source.
 */
export const getOrgId = (event: APIGatewayProxyEvent): string =>
    (event as any).organizationId || '';

export const commonMiddleware = (handler: (event: APIGatewayProxyEvent, context: any) => Promise<APIGatewayProxyResult>) => {
    return middy(handler)
        .use(httpHeaderNormalizer())
        .use(jsonBodyParser())
        .use(corsMiddleware())
        .use(orgContextMiddleware())
        .use(logMetrics(metrics, { captureColdStartMetric: true }))
        .use(errorHandlerMiddleware());
};

/**
 * Middleware chain for super admin routes that do not require organization context.
 * Used by organization management endpoints (list all orgs, create org, etc.).
 */
export const superAdminMiddleware = (handler: (event: APIGatewayProxyEvent, context: any) => Promise<APIGatewayProxyResult>) => {
    return middy(handler)
        .use(httpHeaderNormalizer())
        .use(jsonBodyParser())
        .use(corsMiddleware())
        .use(logMetrics(metrics, { captureColdStartMetric: true }))
        .use(errorHandlerMiddleware());
};

/**
 * Middleware chain for public (unauthenticated) routes.
 * No org context injection or auth required.
 */
export const publicMiddleware = (handler: (event: APIGatewayProxyEvent, context: any) => Promise<APIGatewayProxyResult>) => {
    return middy(handler)
        .use(httpHeaderNormalizer())
        .use(jsonBodyParser())
        .use(corsMiddleware())
        .use(logMetrics(metrics, { captureColdStartMetric: true }))
        .use(errorHandlerMiddleware());
};
