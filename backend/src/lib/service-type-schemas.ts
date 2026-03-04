import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

const serviceUnitEnum = z.enum(["per_visit", "per_hour", "per_sqft"]);
const serviceFrequencyEnum = z.enum(["weekly", "biweekly", "monthly", "quarterly", "annually", "one_time"]);

export const CreateServiceTypeSchema = z.object({
    name: z.string().min(1, "Name is required").openapi({ example: 'Lawn Care' }),
    description: z.string().optional().openapi({ example: 'Regular lawn mowing and edging' }),
    basePrice: z.number().int().min(0).optional().openapi({ example: 4999 }),
    unit: serviceUnitEnum.optional().openapi({ example: 'per_visit' }),
    estimatedDuration: z.number().int().min(1).optional().openapi({ example: 60 }),
    frequency: serviceFrequencyEnum.optional().openapi({ example: 'monthly' }),
}).openapi('CreateServiceType');

export type CreateServiceTypeInput = z.infer<typeof CreateServiceTypeSchema>;

export const UpdateServiceTypeSchema = z.object({
    name: z.string().min(1).optional().openapi({ example: 'Lawn Care' }),
    description: z.string().optional().openapi({ example: 'Regular lawn mowing and edging' }),
    basePrice: z.number().int().min(0).optional().openapi({ example: 4999 }),
    unit: serviceUnitEnum.optional().openapi({ example: 'per_visit' }),
    estimatedDuration: z.number().int().min(1).optional().openapi({ example: 60 }),
    frequency: serviceFrequencyEnum.optional().openapi({ example: 'monthly' }),
}).openapi('UpdateServiceType');

export type UpdateServiceTypeInput = z.infer<typeof UpdateServiceTypeSchema>;
