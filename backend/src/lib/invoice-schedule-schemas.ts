import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

export const CreateInvoiceScheduleSchema = z.object({
    frequency: z.enum(["monthly", "quarterly", "annually"]).openapi({ example: 'monthly' }),
    nextInvoiceDate: z.string().min(1, "Next invoice date is required").openapi({ example: '2026-03-01' }),
    dayOfMonth: z.number().int().min(1).max(31).optional().openapi({ example: 1 }),
}).openapi('CreateInvoiceSchedule');

export type CreateInvoiceScheduleInput = z.infer<typeof CreateInvoiceScheduleSchema>;

export const UpdateInvoiceScheduleSchema = z.object({
    frequency: z.enum(["monthly", "quarterly", "annually"]).optional().openapi({ example: 'quarterly' }),
    nextInvoiceDate: z.string().min(1).optional().openapi({ example: '2026-04-01' }),
    dayOfMonth: z.number().int().min(1).max(31).optional().openapi({ example: 15 }),
}).openapi('UpdateInvoiceSchedule');

export type UpdateInvoiceScheduleInput = z.infer<typeof UpdateInvoiceScheduleSchema>;
