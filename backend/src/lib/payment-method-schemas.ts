import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

export const CreatePaymentMethodSchema = z.object({
    type: z.enum(["credit_card", "debit_card", "bank_account", "ach"]).openapi({ example: 'credit_card' }),
    last4: z.string().length(4, "Last 4 digits must be exactly 4 characters").openapi({ example: '4242' }),
    isDefault: z.boolean().optional().openapi({ example: true }),
}).openapi('CreatePaymentMethod');

export type CreatePaymentMethodInput = z.infer<typeof CreatePaymentMethodSchema>;
