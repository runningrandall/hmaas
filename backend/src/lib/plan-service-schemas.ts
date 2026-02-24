import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

export const CreatePlanServiceSchema = z.object({
    serviceTypeId: z.string().min(1, "Service type ID is required").openapi({ example: 'svc-type-123' }),
    includedVisits: z.number().int().min(0).optional().openapi({ example: 12 }),
    frequency: z.string().optional().openapi({ example: 'monthly' }),
}).openapi('CreatePlanService');

export type CreatePlanServiceInput = z.infer<typeof CreatePlanServiceSchema>;
