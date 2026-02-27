import {
    Organization,
    CreateOrganizationRequest,
    UpdateOrganizationRequest,
    OrganizationRepository,
    OrganizationSecretsManager,
    OrganizationConfig,
} from "../domain/organization";
import { EventPublisher, PaginationOptions, PaginatedResult } from "../domain/shared";
import { randomUUID } from "crypto";
import { logger, metrics } from "../lib/observability";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { AppError } from "../lib/error";

const MASKED_VALUE = "********";

export class OrganizationService {
    constructor(
        private organizationRepository: OrganizationRepository,
        private secretsManager: OrganizationSecretsManager,
        private eventPublisher: EventPublisher
    ) {}

    async createOrganization(request: CreateOrganizationRequest): Promise<Organization> {
        logger.info("Creating organization", { name: request.name, slug: request.slug });

        const existing = await this.organizationRepository.getBySlug(request.slug);
        if (existing) {
            throw new AppError("Organization with this slug already exists", 409);
        }

        const organizationId = randomUUID();

        const organization: Organization = {
            organizationId,
            name: request.name,
            slug: request.slug,
            status: "active",
            ownerUserId: request.ownerUserId,
            billingEmail: request.billingEmail,
            phone: request.phone,
            address: request.address,
            city: request.city,
            state: request.state,
            zip: request.zip,
            timezone: request.timezone,
            createdAt: new Date().toISOString(),
        };

        const created = await this.organizationRepository.create(organization);

        metrics.addMetric("OrganizationsCreated", MetricUnit.Count, 1);
        await this.eventPublisher.publish("OrganizationCreated", { organizationId });

        return created;
    }

    async getOrganization(organizationId: string): Promise<Organization> {
        const organization = await this.organizationRepository.get(organizationId);
        if (!organization) {
            throw new AppError("Organization not found", 404);
        }
        return organization;
    }

    async getOrganizationBySlug(slug: string): Promise<Organization> {
        const organization = await this.organizationRepository.getBySlug(slug);
        if (!organization) {
            throw new AppError("Organization not found", 404);
        }
        return organization;
    }

    async listOrganizations(options?: PaginationOptions): Promise<PaginatedResult<Organization>> {
        return this.organizationRepository.list(options);
    }

    async updateOrganization(organizationId: string, request: UpdateOrganizationRequest): Promise<Organization> {
        const existing = await this.getOrganization(organizationId);

        if (request.slug && request.slug !== existing.slug) {
            const slugTaken = await this.organizationRepository.getBySlug(request.slug);
            if (slugTaken) {
                throw new AppError("Organization with this slug already exists", 409);
            }
        }

        const updated = await this.organizationRepository.update(organizationId, request);

        if (request.status && request.status !== existing.status) {
            if (request.status === "suspended") {
                await this.eventPublisher.publish("OrganizationSuspended", {
                    organizationId,
                    previousStatus: existing.status,
                });
            }
        }

        return updated;
    }

    async deleteOrganization(organizationId: string): Promise<void> {
        await this.organizationRepository.delete(organizationId);
        logger.info("Organization deleted", { organizationId });
    }

    async getConfig(organizationId: string): Promise<OrganizationConfig> {
        const organization = await this.getOrganization(organizationId);
        return organization.config || {};
    }

    async updateConfig(organizationId: string, config: OrganizationConfig): Promise<Organization> {
        await this.getOrganization(organizationId);
        const updated = await this.organizationRepository.updateConfig(organizationId, config);

        await this.eventPublisher.publish("OrganizationConfigUpdated", { organizationId });

        return updated;
    }

    async getSecrets(organizationId: string): Promise<Record<string, string>> {
        await this.getOrganization(organizationId);
        const secrets = await this.secretsManager.getSecrets(organizationId);
        const masked: Record<string, string> = {};
        for (const key of Object.keys(secrets)) {
            masked[key] = MASKED_VALUE;
        }
        return masked;
    }

    async setSecret(organizationId: string, key: string, value: string): Promise<void> {
        await this.getOrganization(organizationId);
        await this.secretsManager.setSecret(organizationId, key, value);
        logger.info("Organization secret set", { organizationId, key });
    }
}
