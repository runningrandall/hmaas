import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

export const CreateSubcontractorRateSchema = z.object({
    propertyId: z.string().min(1, "Property ID is required").openapi({ example: 'prop-abc-123' }),
    serviceTypeId: z.string().min(1, "Service type ID is required").openapi({ example: 'svc-type-456' }),
    rate: z.number().int().min(0, "Rate must be a non-negative integer (cents)").openapi({ example: 7500 }),
    unit: z.string().min(1, "Unit is required").openapi({ example: 'per_visit' }),
    effectiveDate: z.string().optional().openapi({ example: '2026-04-01' }),
    notes: z.string().optional().openapi({ example: 'Negotiated rate for 2026 season' }),
}).openapi('CreateSubcontractorRate');

export type CreateSubcontractorRateInput = z.infer<typeof CreateSubcontractorRateSchema>;

export const UpdateSubcontractorRateSchema = z.object({
    rate: z.number().int().min(0).optional().openapi({ example: 8000 }),
    unit: z.string().min(1).optional().openapi({ example: 'per_visit' }),
    effectiveDate: z.string().optional().openapi({ example: '2026-04-01' }),
    notes: z.string().optional().openapi({ example: 'Updated rate' }),
}).openapi('UpdateSubcontractorRate');

export type UpdateSubcontractorRateInput = z.infer<typeof UpdateSubcontractorRateSchema>;
