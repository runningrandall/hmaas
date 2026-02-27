import middy from '@middy/core';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { AppError } from './error';

/**
 * Middleware that extracts organizationId from the authorizer context
 * and attaches it to the event for downstream handler access.
 */
export const orgContextMiddleware = (): middy.MiddlewareObj<APIGatewayProxyEvent, APIGatewayProxyResult> => ({
    before: async (request) => {
        const orgId = request.event.requestContext?.authorizer?.organizationId
            || request.event.headers?.['x-organization-id'];
        if (!orgId) {
            throw new AppError('Missing organizationId in request context', 403, 'FORBIDDEN');
        }
        (request.event as any).organizationId = orgId;
    },
});
