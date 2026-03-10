import { Subcontractor, CreateSubcontractorRequest, UpdateSubcontractorRequest } from "../domain/subcontractor";
import { SubcontractorRepository } from "../ports/subcontractor-repository";
import { PaginationOptions, PaginatedResult } from "../domain/shared";
import { EventPublisher } from "../ports/event-publisher";
import { randomUUID } from "crypto";
import { logger, metrics } from "../lib/observability";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { AppError } from "../lib/error";

export class SubcontractorService {
    constructor(
        private repository: SubcontractorRepository,
        private eventPublisher: EventPublisher
    ) {}

    async createSubcontractor(organizationId: string, request: CreateSubcontractorRequest): Promise<Subcontractor> {
        logger.info("Creating subcontractor", { name: request.name });

        const subcontractor: Subcontractor = {
            organizationId,
            subcontractorId: randomUUID(),
            name: request.name,
            contactName: request.contactName,
            email: request.email,
            phone: request.phone,
            status: "active",
            notes: request.notes,
            createdAt: new Date().toISOString(),
        };

        const created = await this.repository.create(subcontractor);
        metrics.addMetric('SubcontractorsCreated', MetricUnit.Count, 1);
        await this.eventPublisher.publish("SubcontractorCreated", {
            organizationId,
            subcontractorId: created.subcontractorId,
        });

        return created;
    }

    async getSubcontractor(organizationId: string, subcontractorId: string): Promise<Subcontractor> {
        const subcontractor = await this.repository.get(organizationId, subcontractorId);
        if (!subcontractor) {
            throw new AppError("Subcontractor not found", 404);
        }
        return subcontractor;
    }

    async listSubcontractors(organizationId: string, options?: PaginationOptions): Promise<PaginatedResult<Subcontractor>> {
        return this.repository.list(organizationId, options);
    }

    async updateSubcontractor(organizationId: string, subcontractorId: string, request: UpdateSubcontractorRequest): Promise<Subcontractor> {
        await this.getSubcontractor(organizationId, subcontractorId);
        const updated = await this.repository.update(organizationId, subcontractorId, request);
        return updated;
    }

    async deleteSubcontractor(organizationId: string, subcontractorId: string): Promise<void> {
        await this.repository.delete(organizationId, subcontractorId);
        logger.info("Subcontractor deleted", { subcontractorId });
    }
}
