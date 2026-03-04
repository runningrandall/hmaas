import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

export const CreateEntityCategorySchema = z.object({
    categoryId: z.string().min(1, "Category ID is required").openapi({ example: 'cat-123' }),
}).openapi('CreateEntityCategory');

export type CreateEntityCategoryInput = z.infer<typeof CreateEntityCategorySchema>;
