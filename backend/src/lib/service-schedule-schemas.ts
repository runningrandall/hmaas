import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

export const CreateServiceScheduleSchema = z.object({
    serviceId: z.string().min(1, "Service ID is required").openapi({ example: 'svc-001' }),
    servicerId: z.string().min(1, "Servicer ID is required").openapi({ example: 'servicer-001' }),
    scheduledDate: z.string().min(1, "Scheduled date is required").openapi({ example: '2024-06-15' }),
    scheduledTime: z.string().optional().openapi({ example: '09:00' }),
    estimatedDuration: z.number().int().positive().optional().openapi({ example: 60 }),
}).openapi('CreateServiceSchedule');

export type CreateServiceScheduleInput = z.infer<typeof CreateServiceScheduleSchema>;

export const UpdateServiceScheduleSchema = z.object({
    scheduledDate: z.string().optional().openapi({ example: '2024-06-16' }),
    scheduledTime: z.string().optional().openapi({ example: '10:00' }),
    estimatedDuration: z.number().int().positive().optional().openapi({ example: 90 }),
    status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]).optional().openapi({ example: 'completed' }),
    completedAt: z.string().optional().openapi({ example: '2024-06-15T11:30:00Z' }),
}).openapi('UpdateServiceSchedule');

export type UpdateServiceScheduleInput = z.infer<typeof UpdateServiceScheduleSchema>;
