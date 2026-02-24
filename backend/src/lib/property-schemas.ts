import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

export const CreatePropertySchema = z.object({
    propertyTypeId: z.string().min(1, "Property type is required").openapi({ example: 'pt-residential' }),
    name: z.string().min(1, "Name is required").openapi({ example: 'Main Residence' }),
    address: z.string().min(1, "Address is required").openapi({ example: '123 Main St' }),
    city: z.string().min(1, "City is required").openapi({ example: 'Denver' }),
    state: z.string().min(1, "State is required").openapi({ example: 'CO' }),
    zip: z.string().min(1, "Zip is required").openapi({ example: '80202' }),
    lat: z.number().optional().openapi({ example: 39.7392 }),
    lng: z.number().optional().openapi({ example: -104.9903 }),
    lotSize: z.number().optional().openapi({ example: 5000 }),
    notes: z.string().optional().openapi({ example: 'Corner lot with large backyard' }),
}).openapi('CreateProperty');

export type CreatePropertyInput = z.infer<typeof CreatePropertySchema>;

export const UpdatePropertySchema = z.object({
    propertyTypeId: z.string().min(1).optional().openapi({ example: 'pt-residential' }),
    name: z.string().min(1).optional().openapi({ example: 'Main Residence' }),
    address: z.string().min(1).optional().openapi({ example: '123 Main St' }),
    city: z.string().min(1).optional().openapi({ example: 'Denver' }),
    state: z.string().min(1).optional().openapi({ example: 'CO' }),
    zip: z.string().min(1).optional().openapi({ example: '80202' }),
    lat: z.number().optional().openapi({ example: 39.7392 }),
    lng: z.number().optional().openapi({ example: -104.9903 }),
    lotSize: z.number().optional().openapi({ example: 5000 }),
    notes: z.string().optional().openapi({ example: 'Updated notes' }),
    status: z.enum(["active", "inactive"]).optional().openapi({ example: 'active' }),
}).openapi('UpdateProperty');

export type UpdatePropertyInput = z.infer<typeof UpdatePropertySchema>;
