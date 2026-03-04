import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

export const CreateServiceTypeSchema = z.object({
    name: z.string().min(1, "Name is required").openapi({ example: 'Lawn Care' }),
    description: z.string().optional().openapi({ example: 'Regular lawn mowing and edging' }),
}).openapi('CreateServiceType');

export type CreateServiceTypeInput = z.infer<typeof CreateServiceTypeSchema>;

export const UpdateServiceTypeSchema = z.object({
    name: z.string().min(1).optional().openapi({ example: 'Lawn Care' }),
    description: z.string().optional().openapi({ example: 'Regular lawn mowing and edging' }),
}).openapi('UpdateServiceType');

export type UpdateServiceTypeInput = z.infer<typeof UpdateServiceTypeSchema>;
