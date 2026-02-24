import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

export const LineItemSchema = z.object({
    description: z.string().min(1, "Description is required").openapi({ example: 'Lawn mowing service' }),
    quantity: z.number().int().min(1, "Quantity must be at least 1").openapi({ example: 1 }),
    unitPrice: z.number().int().min(0, "Unit price must be non-negative").openapi({ example: 5000 }),
    total: z.number().int().min(0, "Total must be non-negative").openapi({ example: 5000 }),
}).openapi('LineItem');

export const CreateInvoiceSchema = z.object({
    customerId: z.string().min(1, "Customer ID is required").openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
    invoiceNumber: z.string().min(1, "Invoice number is required").openapi({ example: 'INV-2026-001' }),
    invoiceDate: z.string().min(1, "Invoice date is required").openapi({ example: '2026-02-23' }),
    dueDate: z.string().min(1, "Due date is required").openapi({ example: '2026-03-23' }),
    subtotal: z.number().int().min(0, "Subtotal must be non-negative").openapi({ example: 10000 }),
    tax: z.number().int().min(0, "Tax must be non-negative").openapi({ example: 800 }),
    total: z.number().int().min(0, "Total must be non-negative").openapi({ example: 10800 }),
    lineItems: z.array(LineItemSchema).optional().openapi({ example: [{ description: 'Lawn mowing service', quantity: 1, unitPrice: 5000, total: 5000 }] }),
}).openapi('CreateInvoice');

export type CreateInvoiceInput = z.infer<typeof CreateInvoiceSchema>;

export const UpdateInvoiceSchema = z.object({
    invoiceDate: z.string().min(1).optional().openapi({ example: '2026-02-23' }),
    dueDate: z.string().min(1).optional().openapi({ example: '2026-03-23' }),
    subtotal: z.number().int().min(0).optional().openapi({ example: 10000 }),
    tax: z.number().int().min(0).optional().openapi({ example: 800 }),
    total: z.number().int().min(0).optional().openapi({ example: 10800 }),
    status: z.enum(["draft", "sent", "paid", "overdue", "cancelled"]).optional().openapi({ example: 'sent' }),
    lineItems: z.array(LineItemSchema).optional().openapi({ example: [{ description: 'Lawn mowing service', quantity: 1, unitPrice: 5000, total: 5000 }] }),
}).openapi('UpdateInvoice');

export type UpdateInvoiceInput = z.infer<typeof UpdateInvoiceSchema>;
