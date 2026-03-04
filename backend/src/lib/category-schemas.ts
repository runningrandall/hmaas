import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

export const CreateCategorySchema = z.object({
    name: z.string().min(1, "Name is required").openapi({ example: 'Outdoor' }),
    description: z.string().optional().openapi({ example: 'Outdoor property services' }),
}).openapi('CreateCategory');

export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;

export const UpdateCategorySchema = z.object({
    name: z.string().min(1).optional().openapi({ example: 'Outdoor' }),
    description: z.string().optional().openapi({ example: 'Outdoor property services' }),
}).openapi('UpdateCategory');

export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>;
