import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

export const CreateCapabilitySchema = z.object({
    serviceTypeId: z.string().min(1, "Service type ID is required").openapi({ example: 'svc-type-001' }),
    level: z.enum(["beginner", "intermediate", "expert"]).openapi({ example: 'intermediate' }),
    certificationDate: z.string().optional().openapi({ example: '2024-03-01' }),
}).openapi('CreateCapability');

export type CreateCapabilityInput = z.infer<typeof CreateCapabilitySchema>;
