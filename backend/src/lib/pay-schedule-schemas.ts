import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

export const CreatePayScheduleSchema = z.object({
    name: z.string().min(1, "Name is required").openapi({ example: 'Bi-Weekly Friday' }),
    frequency: z.enum(["weekly", "biweekly", "semimonthly", "monthly"]).openapi({ example: 'biweekly' }),
    dayOfWeek: z.number().int().min(0).max(6).optional().openapi({ example: 5, description: '0=Sunday, 6=Saturday' }),
    dayOfMonth: z.number().int().min(1).max(31).optional().openapi({ example: 15 }),
}).openapi('CreatePaySchedule');

export type CreatePayScheduleInput = z.infer<typeof CreatePayScheduleSchema>;

export const UpdatePayScheduleSchema = z.object({
    name: z.string().min(1).optional().openapi({ example: 'Monthly 15th' }),
    frequency: z.enum(["weekly", "biweekly", "semimonthly", "monthly"]).optional().openapi({ example: 'monthly' }),
    dayOfWeek: z.number().int().min(0).max(6).optional().openapi({ example: 5, description: '0=Sunday, 6=Saturday' }),
    dayOfMonth: z.number().int().min(1).max(31).optional().openapi({ example: 15 }),
}).openapi('UpdatePaySchedule');

export type UpdatePayScheduleInput = z.infer<typeof UpdatePayScheduleSchema>;
