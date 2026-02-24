import { Capability, CreateCapabilityRequest, CapabilityRepository } from "../domain/capability";
import { EventPublisher, PaginationOptions, PaginatedResult } from "../domain/shared";
import { randomUUID } from "crypto";
import { logger, metrics } from "../lib/observability";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { AppError } from "../lib/error";

export class CapabilityService {
    constructor(
        private repository: CapabilityRepository,
        private eventPublisher: EventPublisher
    ) {}

    async createCapability(request: CreateCapabilityRequest): Promise<Capability> {
        logger.info("Creating capability", { employeeId: request.employeeId, serviceTypeId: request.serviceTypeId });

        const capability: Capability = {
            capabilityId: randomUUID(),
            employeeId: request.employeeId,
            serviceTypeId: request.serviceTypeId,
            level: request.level,
            certificationDate: request.certificationDate,
            createdAt: new Date().toISOString(),
        };

        const created = await this.repository.create(capability);
        metrics.addMetric('CapabilitiesCreated', MetricUnit.Count, 1);
        await this.eventPublisher.publish("CapabilityCreated", { capabilityId: created.capabilityId, employeeId: request.employeeId });

        return created;
    }

    async getCapability(capabilityId: string): Promise<Capability> {
        const capability = await this.repository.get(capabilityId);
        if (!capability) {
            throw new AppError("Capability not found", 404);
        }
        return capability;
    }

    async listCapabilitiesByEmployee(employeeId: string, options?: PaginationOptions): Promise<PaginatedResult<Capability>> {
        return this.repository.listByEmployeeId(employeeId, options);
    }

    async deleteCapability(capabilityId: string): Promise<void> {
        await this.getCapability(capabilityId);
        await this.repository.delete(capabilityId);
        logger.info("Capability deleted", { capabilityId });
    }
}
