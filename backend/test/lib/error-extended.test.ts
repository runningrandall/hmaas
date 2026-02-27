import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/lib/observability', () => ({
    logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { validateOrThrow, AppError } from '../../src/lib/error';
import { z } from 'zod';

describe('validateOrThrow', () => {
    it('should return parsed data when the schema parse succeeds', () => {
        const schema = z.object({ name: z.string(), age: z.number() });
        const parseResult = schema.safeParse({ name: 'Alice', age: 30 });

        const data = validateOrThrow(parseResult);

        expect(data).toEqual({ name: 'Alice', age: 30 });
    });

    it('should throw an AppError with status 400 when the schema parse fails', () => {
        const schema = z.object({ email: z.string().email() });
        const parseResult = schema.safeParse({ email: 'not-an-email' });

        expect(() => validateOrThrow(parseResult)).toThrow(AppError);

        try {
            validateOrThrow(parseResult);
        } catch (err) {
            expect(err).toBeInstanceOf(AppError);
            expect((err as AppError).statusCode).toBe(400);
            expect((err as AppError).code).toBe('VALIDATION_ERROR');
            expect((err as AppError).message).toBe('Validation failed');
        }
    });

    it('should include field-level details in the thrown AppError', () => {
        const schema = z.object({
            firstName: z.string(),
            age: z.number().min(0),
        });
        const parseResult = schema.safeParse({ age: -1 });

        try {
            validateOrThrow(parseResult);
            // Should not reach here
            expect.fail('Expected validateOrThrow to throw');
        } catch (err) {
            expect(err).toBeInstanceOf(AppError);
            const details = (err as AppError).details as Array<{ path: string; message: string }>;
            expect(Array.isArray(details)).toBe(true);
            expect(details.length).toBeGreaterThan(0);

            // firstName is missing
            const firstNameDetail = details.find(d => d.path === 'firstName');
            expect(firstNameDetail).toBeDefined();
            expect(firstNameDetail?.message).toBeTruthy();

            // age is below minimum
            const ageDetail = details.find(d => d.path === 'age');
            expect(ageDetail).toBeDefined();
            expect(ageDetail?.message).toBeTruthy();
        }
    });

    it('should handle a nested schema path as a dot-separated string', () => {
        const schema = z.object({
            address: z.object({ zip: z.string().length(5) }),
        });
        const parseResult = schema.safeParse({ address: { zip: '123' } });

        try {
            validateOrThrow(parseResult);
            expect.fail('Expected validateOrThrow to throw');
        } catch (err) {
            expect(err).toBeInstanceOf(AppError);
            const details = (err as AppError).details as Array<{ path: string; message: string }>;
            const zipDetail = details.find(d => d.path === 'address.zip');
            expect(zipDetail).toBeDefined();
        }
    });

    it('should return data with correct TypeScript type inference', () => {
        const schema = z.object({ id: z.string(), count: z.number() });
        const parseResult = schema.safeParse({ id: 'item-1', count: 42 });

        const data = validateOrThrow(parseResult);

        // TypeScript would enforce the type; verify runtime shape
        expect(data.id).toBe('item-1');
        expect(data.count).toBe(42);
    });
});
