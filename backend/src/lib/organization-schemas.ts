import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

export const CreateOrganizationSchema = z.object({
    name: z.string().min(1, "Organization name is required").openapi({ example: 'Versa Property Management' }),
    slug: z.string().min(1).max(63).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens").openapi({ example: 'versa-pm' }),
    ownerUserId: z.string().min(1, "Owner user ID is required").openapi({ example: 'user-abc-123' }),
    billingEmail: z.string().email("Invalid billing email").openapi({ example: 'billing@versa.com' }),
    phone: z.string().optional().openapi({ example: '555-0100' }),
    address: z.string().optional().openapi({ example: '123 Main St' }),
    city: z.string().optional().openapi({ example: 'Denver' }),
    state: z.string().optional().openapi({ example: 'CO' }),
    zip: z.string().optional().openapi({ example: '80202' }),
    timezone: z.string().optional().openapi({ example: 'America/Denver' }),
}).openapi('CreateOrganization');

export type CreateOrganizationInput = z.infer<typeof CreateOrganizationSchema>;

export const UpdateOrganizationSchema = z.object({
    name: z.string().min(1).optional().openapi({ example: 'Versa Property Management' }),
    slug: z.string().min(1).max(63).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens").optional().openapi({ example: 'versa-pm' }),
    status: z.enum(["active", "inactive", "suspended"]).optional().openapi({ example: 'active' }),
    ownerUserId: z.string().min(1).optional().openapi({ example: 'user-abc-123' }),
    billingEmail: z.string().email().optional().openapi({ example: 'billing@versa.com' }),
    phone: z.string().optional().openapi({ example: '555-0100' }),
    address: z.string().optional().openapi({ example: '123 Main St' }),
    city: z.string().optional().openapi({ example: 'Denver' }),
    state: z.string().optional().openapi({ example: 'CO' }),
    zip: z.string().optional().openapi({ example: '80202' }),
    timezone: z.string().optional().openapi({ example: 'America/Denver' }),
}).openapi('UpdateOrganization');

export type UpdateOrganizationInput = z.infer<typeof UpdateOrganizationSchema>;

export const UpdateOrgConfigSchema = z.object({
    googleMapsApiKey: z.string().optional().openapi({ example: 'AIza...' }),
    defaultPlanId: z.string().optional().openapi({ example: 'plan-abc-123' }),
    invoiceDayOfMonth: z.number().int().min(1).max(28).optional().openapi({ example: 1 }),
    brandColor: z.string().optional().openapi({ example: '#4F46E5' }),
    logoUrl: z.string().url().optional().openapi({ example: 'https://example.com/logo.png' }),
}).openapi('UpdateOrgConfig');

export type UpdateOrgConfigInput = z.infer<typeof UpdateOrgConfigSchema>;

export const SetOrgSecretSchema = z.object({
    value: z.string().min(1, "Secret value is required").openapi({ example: 'sk_live_...' }),
}).openapi('SetOrgSecret');

export type SetOrgSecretInput = z.infer<typeof SetOrgSecretSchema>;
