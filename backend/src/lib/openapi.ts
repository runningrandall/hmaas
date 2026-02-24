import { OpenApiGeneratorV3, OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

// Bearer auth scheme
registry.registerComponent('securitySchemes', 'BearerAuth', {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    description: 'Cognito JWT access token',
});

// Shared schemas
const ErrorResponseSchema = z.object({
    error: z.object({
        code: z.string().openapi({ example: 'NOT_FOUND' }),
        message: z.string().openapi({ example: 'Resource not found' }),
        details: z.any().optional().openapi({ example: [{ path: 'name', message: 'Required' }] }),
        requestId: z.string().optional().openapi({ example: 'abc-123-def' }),
    }),
}).openapi('ErrorResponse');

registry.register('ErrorResponse', ErrorResponseSchema);

export function generateOpenApiSpec() {
    const generator = new OpenApiGeneratorV3(registry.definitions);

    return generator.generateDocument({
        openapi: '3.0.0',
        info: {
            title: 'Versa Property Management API',
            version: '1.0.0',
            description: 'API for Versa Property Management Services',
        },
        servers: [
            {
                url: 'https://{apiId}.execute-api.{region}.amazonaws.com/prod',
                description: 'Production',
                variables: {
                    apiId: { default: 'xxxxx' },
                    region: { default: 'us-east-1' },
                },
            },
            {
                url: 'http://localhost:3001',
                description: 'Local Development',
            },
        ],
    });
}
