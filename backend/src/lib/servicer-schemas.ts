import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

export const CreateServicerSchema = z.object({
    serviceArea: z.string().optional().openapi({ example: 'North Denver Metro' }),
    maxDailyJobs: z.number().int().positive().optional().openapi({ example: 8 }),
}).openapi('CreateServicer');

export type CreateServicerInput = z.infer<typeof CreateServicerSchema>;

export const UpdateServicerSchema = z.object({
    serviceArea: z.string().optional().openapi({ example: 'South Denver Metro' }),
    maxDailyJobs: z.number().int().positive().optional().openapi({ example: 10 }),
    rating: z.number().min(0).max(5).optional().openapi({ example: 4.5 }),
    status: z.enum(["active", "inactive"]).optional().openapi({ example: 'active' }),
}).openapi('UpdateServicer');

export type UpdateServicerInput = z.infer<typeof UpdateServicerSchema>;
