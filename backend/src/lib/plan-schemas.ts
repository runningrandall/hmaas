import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

export const CreatePlanSchema = z.object({
    name: z.string().min(1, "Name is required").openapi({ example: 'Premium Bundle' }),
    description: z.string().optional().openapi({ example: 'All-inclusive property management package' }),
    monthlyPrice: z.number().int().min(0, "Monthly price must be a non-negative integer (cents)").openapi({ example: 14999 }),
    annualPrice: z.number().int().min(0).optional().openapi({ example: 149990 }),
    status: z.enum(["active", "inactive"]).optional().openapi({ example: 'active' }),
}).openapi('CreatePlan');

export type CreatePlanInput = z.infer<typeof CreatePlanSchema>;

export const UpdatePlanSchema = z.object({
    name: z.string().min(1).optional().openapi({ example: 'Premium Bundle' }),
    description: z.string().optional().openapi({ example: 'All-inclusive property management package' }),
    monthlyPrice: z.number().int().min(0).optional().openapi({ example: 14999 }),
    annualPrice: z.number().int().min(0).optional().openapi({ example: 149990 }),
    status: z.enum(["active", "inactive"]).optional().openapi({ example: 'active' }),
}).openapi('UpdatePlan');

export type UpdatePlanInput = z.infer<typeof UpdatePlanSchema>;
