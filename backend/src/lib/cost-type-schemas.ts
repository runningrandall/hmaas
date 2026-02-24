import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

export const CreateCostTypeSchema = z.object({
    name: z.string().min(1, "Name is required").openapi({ example: 'One-Time' }),
    description: z.string().optional().openapi({ example: 'One-time service charge' }),
}).openapi('CreateCostType');

export type CreateCostTypeInput = z.infer<typeof CreateCostTypeSchema>;

export const UpdateCostTypeSchema = z.object({
    name: z.string().min(1).optional().openapi({ example: 'One-Time' }),
    description: z.string().optional().openapi({ example: 'One-time service charge' }),
}).openapi('UpdateCostType');

export type UpdateCostTypeInput = z.infer<typeof UpdateCostTypeSchema>;
