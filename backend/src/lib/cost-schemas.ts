import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

export const CreateCostSchema = z.object({
    costTypeId: z.string().min(1, "Cost type ID is required").openapi({ example: 'cost-type-123' }),
    amount: z.number().int().min(0, "Amount must be a non-negative integer (cents)").openapi({ example: 5000 }),
    description: z.string().optional().openapi({ example: 'Monthly lawn mowing cost' }),
    effectiveDate: z.string().optional().openapi({ example: '2026-03-01' }),
}).openapi('CreateCost');

export type CreateCostInput = z.infer<typeof CreateCostSchema>;
