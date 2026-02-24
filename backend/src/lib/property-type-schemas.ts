import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

export const CreatePropertyTypeSchema = z.object({
    name: z.string().min(1, "Name is required").openapi({ example: 'Residential' }),
    description: z.string().optional().openapi({ example: 'Single-family residential property' }),
}).openapi('CreatePropertyType');

export type CreatePropertyTypeInput = z.infer<typeof CreatePropertyTypeSchema>;

export const UpdatePropertyTypeSchema = z.object({
    name: z.string().min(1).optional().openapi({ example: 'Residential' }),
    description: z.string().optional().openapi({ example: 'Single-family residential property' }),
}).openapi('UpdatePropertyType');

export type UpdatePropertyTypeInput = z.infer<typeof UpdatePropertyTypeSchema>;
