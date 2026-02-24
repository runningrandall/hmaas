import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

export const CreateEmployeeSchema = z.object({
    firstName: z.string().min(1, "First name is required").openapi({ example: 'Jane' }),
    lastName: z.string().min(1, "Last name is required").openapi({ example: 'Doe' }),
    email: z.string().email("Invalid email").openapi({ example: 'jane.doe@versa.com' }),
    phone: z.string().optional().openapi({ example: '555-0200' }),
    role: z.string().min(1, "Role is required").openapi({ example: 'Field Technician' }),
    hireDate: z.string().optional().openapi({ example: '2024-01-15' }),
}).openapi('CreateEmployee');

export type CreateEmployeeInput = z.infer<typeof CreateEmployeeSchema>;

export const UpdateEmployeeSchema = z.object({
    firstName: z.string().min(1).optional().openapi({ example: 'Jane' }),
    lastName: z.string().min(1).optional().openapi({ example: 'Doe' }),
    email: z.string().email().optional().openapi({ example: 'jane.doe@versa.com' }),
    phone: z.string().optional().openapi({ example: '555-0200' }),
    role: z.string().min(1).optional().openapi({ example: 'Senior Technician' }),
    status: z.enum(["active", "inactive", "terminated"]).optional().openapi({ example: 'active' }),
    hireDate: z.string().optional().openapi({ example: '2024-01-15' }),
}).openapi('UpdateEmployee');

export type UpdateEmployeeInput = z.infer<typeof UpdateEmployeeSchema>;
