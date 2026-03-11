import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { normalizeAddress, normalizeCity, normalizeState, normalizeZip } from './normalize';

extendZodWithOpenApi(z);

const addressField = z.string().min(1, "Address is required").transform(normalizeAddress);
const cityField = z.string().min(1, "City is required").transform(normalizeCity);
const stateField = z.string().min(1, "State is required").transform(normalizeState);
const zipField = z.string().min(1, "Zip is required").transform(normalizeZip);

export const CreatePropertySchema = z.object({
    propertyTypeId: z.string().min(1, "Property type is required").openapi({ example: 'pt-residential' }),
    name: z.string().min(1, "Name is required").openapi({ example: 'Main Residence' }),
    address: addressField.openapi({ example: '123 Main St' }),
    city: cityField.openapi({ example: 'Denver' }),
    state: stateField.openapi({ example: 'CO' }),
    zip: zipField.openapi({ example: '80202' }),
    lat: z.number().optional().openapi({ example: 39.7392 }),
    lng: z.number().optional().openapi({ example: -104.9903 }),
    lotSize: z.number().optional().openapi({ example: 5000 }),
    measurements: z.record(z.string(), z.number()).optional().openapi({ example: { lawnSqft: 5000, gutterLinearFeet: 150 } }),
    notes: z.string().optional().openapi({ example: 'Corner lot with large backyard' }),
}).openapi('CreateProperty');

export type CreatePropertyInput = z.infer<typeof CreatePropertySchema>;

export const UpdatePropertySchema = z.object({
    propertyTypeId: z.string().min(1).optional().openapi({ example: 'pt-residential' }),
    name: z.string().min(1).optional().openapi({ example: 'Main Residence' }),
    address: z.string().min(1).transform(normalizeAddress).optional().openapi({ example: '123 Main St' }),
    city: z.string().min(1).transform(normalizeCity).optional().openapi({ example: 'Denver' }),
    state: z.string().min(1).transform(normalizeState).optional().openapi({ example: 'CO' }),
    zip: z.string().min(1).transform(normalizeZip).optional().openapi({ example: '80202' }),
    lat: z.number().optional().openapi({ example: 39.7392 }),
    lng: z.number().optional().openapi({ example: -104.9903 }),
    lotSize: z.number().optional().openapi({ example: 5000 }),
    measurements: z.record(z.string(), z.number()).optional().openapi({ example: { lawnSqft: 5000, gutterLinearFeet: 150 } }),
    notes: z.string().optional().openapi({ example: 'Updated notes' }),
    status: z.enum(["active", "inactive"]).optional().openapi({ example: 'active' }),
}).openapi('UpdateProperty');

export type UpdatePropertyInput = z.infer<typeof UpdatePropertySchema>;
