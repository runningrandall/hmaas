import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { normalizePhone } from './normalize';

extendZodWithOpenApi(z);

export const CreateSubcontractorSchema = z.object({
    name: z.string().min(1, "Subcontractor name is required").openapi({ example: 'ABC Lawn Care LLC' }),
    contactName: z.string().optional().openapi({ example: 'John Smith' }),
    email: z.string().email("Invalid email address").openapi({ example: 'john@abclawncare.com' }),
    phone: z.string().transform(normalizePhone).optional().openapi({ example: '303-555-0200' }),
    notes: z.string().optional().openapi({ example: 'Specializes in commercial properties' }),
}).openapi('CreateSubcontractor');

export type CreateSubcontractorInput = z.infer<typeof CreateSubcontractorSchema>;

export const UpdateSubcontractorSchema = z.object({
    name: z.string().min(1).optional().openapi({ example: 'ABC Lawn Care LLC' }),
    contactName: z.string().optional().openapi({ example: 'John Smith' }),
    email: z.string().email().optional().openapi({ example: 'john@abclawncare.com' }),
    phone: z.string().transform(normalizePhone).optional().openapi({ example: '303-555-0200' }),
    status: z.enum(["active", "inactive"]).optional().openapi({ example: 'active' }),
    notes: z.string().optional().openapi({ example: 'Updated notes' }),
}).openapi('UpdateSubcontractor');

export type UpdateSubcontractorInput = z.infer<typeof UpdateSubcontractorSchema>;
