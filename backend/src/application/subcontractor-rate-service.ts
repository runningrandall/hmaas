import { SubcontractorRate, CreateSubcontractorRateRequest, UpdateSubcontractorRateRequest } from "../domain/subcontractor-rate";
import { SubcontractorRateRepository } from "../ports/subcontractor-rate-repository";
import { PaginationOptions, PaginatedResult } from "../domain/shared";
import { EventPublisher } from "../ports/event-publisher";
import { randomUUID } from "crypto";
import { logger, metrics } from "../lib/observability";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { AppError } from "../lib/error";

export class SubcontractorRateService {
    constructor(
        private repository: SubcontractorRateRepository,
        private eventPublisher: EventPublisher
    ) {}

    async createRate(organizationId: string, subcontractorId: string, request: CreateSubcontractorRateRequest): Promise<SubcontractorRate> {
        logger.info("Creating subcontractor rate", { subcontractorId, propertyId: request.propertyId, serviceTypeId: request.serviceTypeId });

        const rate: SubcontractorRate = {
            organizationId,
            subcontractorRateId: randomUUID(),
            subcontractorId,
            propertyId: request.propertyId,
            serviceTypeId: request.serviceTypeId,
            rate: request.rate,
            unit: request.unit,
            effectiveDate: request.effectiveDate,
            notes: request.notes,
            createdAt: new Date().toISOString(),
        };

        const created = await this.repository.create(rate);
        metrics.addMetric('SubcontractorRatesCreated', MetricUnit.Count, 1);
        await this.eventPublisher.publish("SubcontractorRateCreated", {
            organizationId,
            subcontractorRateId: created.subcontractorRateId,
            subcontractorId,
            propertyId: request.propertyId,
            serviceTypeId: request.serviceTypeId,
        });

        return created;
    }

    async getRate(organizationId: string, subcontractorRateId: string): Promise<SubcontractorRate> {
        const rate = await this.repository.get(organizationId, subcontractorRateId);
        if (!rate) {
            throw new AppError("Subcontractor rate not found", 404);
        }
        return rate;
    }

    async listRatesBySubcontractor(organizationId: string, subcontractorId: string, options?: PaginationOptions): Promise<PaginatedResult<SubcontractorRate>> {
        return this.repository.listBySubcontractorId(organizationId, subcontractorId, options);
    }

    async updateRate(organizationId: string, subcontractorRateId: string, request: UpdateSubcontractorRateRequest): Promise<SubcontractorRate> {
        await this.getRate(organizationId, subcontractorRateId);
        const updated = await this.repository.update(organizationId, subcontractorRateId, request);
        return updated;
    }

    async deleteRate(organizationId: string, subcontractorRateId: string): Promise<void> {
        await this.repository.delete(organizationId, subcontractorRateId);
        logger.info("Subcontractor rate deleted", { subcontractorRateId });
    }
}
