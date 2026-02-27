import { OrganizationRepository, Organization, UpdateOrganizationRequest, OrganizationStatus, OrganizationConfig } from "../domain/organization";
import { PaginationOptions, PaginatedResult } from "../domain/shared";
import { DBService } from "../entities/service";
import { z } from "zod";
import { logger } from "../lib/observability";

const OrgConfigSchema = z.object({
    googleMapsApiKey: z.string().optional().nullable(),
    defaultPlanId: z.string().optional().nullable(),
    invoiceDayOfMonth: z.number().optional().nullable(),
    brandColor: z.string().optional().nullable(),
    logoUrl: z.string().optional().nullable(),
}).optional().nullable();

const DynamoOrganizationSchema = z.object({
    organizationId: z.string(),
    name: z.string(),
    slug: z.string(),
    status: z.enum(["active", "inactive", "suspended"]),
    ownerUserId: z.string(),
    billingEmail: z.string(),
    phone: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
    zip: z.string().optional().nullable(),
    timezone: z.string().optional().nullable(),
    config: OrgConfigSchema,
    secretsArn: z.string().optional().nullable(),
    createdAt: z.union([z.string(), z.number()]).transform(v => String(v)),
    updatedAt: z.union([z.string(), z.number()]).optional().transform(v => v != null ? String(v) : undefined),
}).passthrough();

function parseOrganization(data: unknown): Organization {
    const result = DynamoOrganizationSchema.safeParse(data);
    if (!result.success) {
        logger.error("Data validation failed reading from DynamoDB", { errors: result.error.issues, data });
        throw new Error(`Data integrity error: ${result.error.message}`);
    }
    return result.data as Organization;
}

const DEFAULT_PAGE_SIZE = 20;

export class DynamoOrganizationRepository implements OrganizationRepository {
    async create(organization: Organization): Promise<Organization> {
        const { createdAt, updatedAt, ...data } = organization;
        const result = await DBService.entities.organization.create(data).go();
        return parseOrganization(result.data);
    }

    async get(organizationId: string): Promise<Organization | null> {
        const result = await DBService.entities.organization.get({ organizationId }).go();
        if (!result.data) return null;
        return parseOrganization(result.data);
    }

    async getBySlug(slug: string): Promise<Organization | null> {
        const result = await DBService.entities.organization.query.bySlug({ slug }).go({ limit: 1 });
        if (!result.data || result.data.length === 0) return null;
        return parseOrganization(result.data[0]);
    }

    async list(options?: PaginationOptions): Promise<PaginatedResult<Organization>> {
        const limit = options?.limit || DEFAULT_PAGE_SIZE;
        const result = await DBService.entities.organization.scan.go({
            limit,
            ...(options?.cursor && { cursor: options.cursor }),
        });
        return {
            items: result.data.map(parseOrganization),
            cursor: result.cursor ?? null,
        };
    }

    async listByStatus(status: OrganizationStatus, options?: PaginationOptions): Promise<PaginatedResult<Organization>> {
        const limit = options?.limit || DEFAULT_PAGE_SIZE;
        const result = await DBService.entities.organization.query.byStatus({ status }).go({
            limit,
            ...(options?.cursor && { cursor: options.cursor }),
        });
        return {
            items: result.data.map(parseOrganization),
            cursor: result.cursor ?? null,
        };
    }

    async update(organizationId: string, data: UpdateOrganizationRequest): Promise<Organization> {
        const result = await DBService.entities.organization.patch({ organizationId }).set(data).go({ response: "all_new" });
        return parseOrganization(result.data);
    }

    async updateConfig(organizationId: string, config: OrganizationConfig): Promise<Organization> {
        const result = await DBService.entities.organization.patch({ organizationId }).set({ config }).go({ response: "all_new" });
        return parseOrganization(result.data);
    }

    async delete(organizationId: string): Promise<void> {
        await DBService.entities.organization.delete({ organizationId }).go();
    }
}
