import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

export const CreateCustomerSchema = z.object({
    firstName: z.string().min(1, "First name is required").openapi({ example: 'John' }),
    lastName: z.string().min(1, "Last name is required").openapi({ example: 'Smith' }),
    email: z.string().email("Invalid email").openapi({ example: 'john.smith@example.com' }),
    phone: z.string().optional().openapi({ example: '555-0100' }),
    notes: z.string().optional().openapi({ example: 'Referred by existing customer' }),
}).openapi('CreateCustomer');

export type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>;

export const UpdateCustomerSchema = z.object({
    firstName: z.string().min(1).optional().openapi({ example: 'John' }),
    lastName: z.string().min(1).optional().openapi({ example: 'Smith' }),
    email: z.string().email().optional().openapi({ example: 'john.smith@example.com' }),
    phone: z.string().optional().openapi({ example: '555-0100' }),
    status: z.enum(["active", "inactive", "suspended"]).optional().openapi({ example: 'active' }),
    notes: z.string().optional().openapi({ example: 'Updated notes' }),
}).openapi('UpdateCustomer');

export type UpdateCustomerInput = z.infer<typeof UpdateCustomerSchema>;
