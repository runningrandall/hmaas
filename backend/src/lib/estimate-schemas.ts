import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

export const EstimateLineItemSchema = z.object({
    serviceTypeId: z.string().min(1, "Service type ID is required").openapi({ example: 'st-123' }),
    description: z.string().min(1, "Description is required").openapi({ example: 'Lawn Mowing - 5000 sq ft' }),
    quantity: z.number().min(0, "Quantity must be non-negative").openapi({ example: 5000 }),
    unit: z.string().min(1, "Unit is required").openapi({ example: 'sq ft' }),
    unitPrice: z.number().int().min(0, "Unit price must be non-negative").openapi({ example: 5 }),
    total: z.number().int().min(0, "Total must be non-negative").openapi({ example: 25000 }),
    estimatedDuration: z.number().min(0).optional().openapi({ example: 60 }),
}).openapi('EstimateLineItem');

export const GenerateEstimateSchema = z.object({
    customerId: z.string().min(1, "Customer ID is required").openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
    propertyId: z.string().min(1, "Property ID is required").openapi({ example: '550e8400-e29b-41d4-a716-446655440001' }),
    serviceTypeIds: z.array(z.string().min(1)).optional().openapi({ example: ['st-123', 'st-456'] }),
    planId: z.string().optional().openapi({ example: 'plan-123' }),
    notes: z.string().optional().openapi({ example: 'Estimate for spring services' }),
    expirationDate: z.string().optional().openapi({ example: '2026-04-04' }),
}).refine(data => data.serviceTypeIds || data.planId, {
    message: "Either serviceTypeIds or planId must be provided",
}).openapi('GenerateEstimate');

export type GenerateEstimateInput = z.infer<typeof GenerateEstimateSchema>;

export const UpdateEstimateSchema = z.object({
    status: z.enum(["draft", "sent", "accepted", "rejected", "expired", "invoiced"]).optional().openapi({ example: 'sent' }),
    lineItems: z.array(EstimateLineItemSchema).optional(),
    notes: z.string().optional().openapi({ example: 'Updated notes' }),
    expirationDate: z.string().optional().openapi({ example: '2026-04-04' }),
}).openapi('UpdateEstimate');

export type UpdateEstimateInput = z.infer<typeof UpdateEstimateSchema>;
