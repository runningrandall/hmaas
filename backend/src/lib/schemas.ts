import { z } from 'zod';

export const CreateItemSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
});

export type CreateItemRequest = z.infer<typeof CreateItemSchema>;
