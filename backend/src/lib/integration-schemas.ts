import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

export const SetStripeKeysSchema = z.object({
    stripePublicKey: z.string()
        .min(1, "Stripe public key is required")
        .startsWith("pk_", "Stripe public key must start with 'pk_'")
        .openapi({ example: 'pk_live_...' }),
    stripeSecretKey: z.string()
        .min(1, "Stripe secret key is required")
        .startsWith("sk_", "Stripe secret key must start with 'sk_'")
        .openapi({ example: 'sk_live_...' }),
}).openapi('SetStripeKeys');

export type SetStripeKeysInput = z.infer<typeof SetStripeKeysSchema>;
