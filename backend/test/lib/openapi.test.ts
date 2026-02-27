import { describe, it, expect } from 'vitest';
import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { registry, generateOpenApiSpec } from '../../src/lib/openapi';

describe('openapi', () => {
    describe('registry', () => {
        it('should export an OpenAPIRegistry instance', () => {
            expect(registry).toBeInstanceOf(OpenAPIRegistry);
        });
    });

    describe('generateOpenApiSpec', () => {
        it('should return an object with openapi 3.0.0', () => {
            const spec = generateOpenApiSpec();
            expect(spec.openapi).toBe('3.0.0');
        });

        it('should have the correct API title', () => {
            const spec = generateOpenApiSpec();
            expect(spec.info.title).toBe('Versa Property Management API');
        });

        it('should have the correct API version', () => {
            const spec = generateOpenApiSpec();
            expect(spec.info.version).toBe('1.0.0');
        });

        it('should define exactly 2 servers', () => {
            const spec = generateOpenApiSpec();
            expect(spec.servers).toHaveLength(2);
        });

        it('should include a Production server', () => {
            const spec = generateOpenApiSpec();
            const prodServer = spec.servers?.find(s => s.description === 'Production');
            expect(prodServer).toBeDefined();
            expect(prodServer?.url).toContain('amazonaws.com');
        });

        it('should include a Local Development server', () => {
            const spec = generateOpenApiSpec();
            const localServer = spec.servers?.find(s => s.description === 'Local Development');
            expect(localServer).toBeDefined();
            expect(localServer?.url).toBe('http://localhost:3001');
        });

        it('should contain the BearerAuth security scheme', () => {
            const spec = generateOpenApiSpec();
            const securitySchemes = spec.components?.securitySchemes as Record<string, unknown> | undefined;
            expect(securitySchemes).toBeDefined();
            expect(securitySchemes).toHaveProperty('BearerAuth');
            const bearerAuth = securitySchemes!['BearerAuth'] as Record<string, unknown>;
            expect(bearerAuth.type).toBe('http');
            expect(bearerAuth.scheme).toBe('bearer');
            expect(bearerAuth.bearerFormat).toBe('JWT');
        });

        it('should contain the ErrorResponse schema', () => {
            const spec = generateOpenApiSpec();
            const schemas = spec.components?.schemas as Record<string, unknown> | undefined;
            expect(schemas).toBeDefined();
            expect(schemas).toHaveProperty('ErrorResponse');
        });
    });
});
