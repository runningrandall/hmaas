import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

export const CreatePaySchema = z.object({
    payScheduleId: z.string().optional().openapi({ example: 'ps-123' }),
    payType: z.enum(["hourly", "salary", "commission", "bonus"]).openapi({ example: 'hourly' }),
    rate: z.number().int().min(0, "Rate must be a non-negative integer (cents)").openapi({ example: 5000 }),
    effectiveDate: z.string().min(1, "Effective date is required").openapi({ example: '2026-01-01' }),
}).openapi('CreatePay');

export type CreatePayInput = z.infer<typeof CreatePaySchema>;

export const UpdatePaySchema = z.object({
    payScheduleId: z.string().optional().openapi({ example: 'ps-123' }),
    payType: z.enum(["hourly", "salary", "commission", "bonus"]).optional().openapi({ example: 'salary' }),
    rate: z.number().int().min(0, "Rate must be a non-negative integer (cents)").optional().openapi({ example: 7500 }),
    effectiveDate: z.string().optional().openapi({ example: '2026-06-01' }),
}).openapi('UpdatePay');

export type UpdatePayInput = z.infer<typeof UpdatePaySchema>;
