import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

export const CreateDelegateSchema = z.object({
    email: z.string().email("Invalid email").openapi({ example: 'delegate@example.com' }),
    name: z.string().min(1, "Name is required").openapi({ example: 'Jane Smith' }),
    permissions: z.array(z.string()).optional().openapi({ example: ['view_invoices', 'manage_services'] }),
}).openapi('CreateDelegate');

export type CreateDelegateInput = z.infer<typeof CreateDelegateSchema>;
