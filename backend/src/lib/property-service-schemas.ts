import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

export const CreatePropertyServiceSchema = z.object({
    propertyId: z.string().min(1, "Property ID is required").openapi({ example: 'prop-123' }),
    serviceTypeId: z.string().min(1, "Service type ID is required").openapi({ example: 'svc-type-456' }),
    planId: z.string().optional().openapi({ example: 'plan-789' }),
    startDate: z.string().optional().openapi({ example: '2026-03-01' }),
    endDate: z.string().optional().openapi({ example: '2026-12-31' }),
    frequency: z.string().optional().openapi({ example: 'biweekly' }),
}).openapi('CreatePropertyService');

export type CreatePropertyServiceInput = z.infer<typeof CreatePropertyServiceSchema>;

export const UpdatePropertyServiceSchema = z.object({
    status: z.enum(["active", "inactive", "cancelled"]).optional().openapi({ example: 'active' }),
    planId: z.string().optional().openapi({ example: 'plan-789' }),
    startDate: z.string().optional().openapi({ example: '2026-03-01' }),
    endDate: z.string().optional().openapi({ example: '2026-12-31' }),
    frequency: z.string().optional().openapi({ example: 'biweekly' }),
}).openapi('UpdatePropertyService');

export type UpdatePropertyServiceInput = z.infer<typeof UpdatePropertyServiceSchema>;
