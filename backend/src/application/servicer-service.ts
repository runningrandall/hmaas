import { Servicer, CreateServicerRequest, UpdateServicerRequest, ServicerRepository } from "../domain/servicer";
import { EventPublisher, PaginationOptions, PaginatedResult } from "../domain/shared";
import { randomUUID } from "crypto";
import { logger, metrics } from "../lib/observability";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { AppError } from "../lib/error";

export class ServicerService {
    constructor(
        private repository: ServicerRepository,
        private eventPublisher: EventPublisher
    ) {}

    async createServicer(organizationId: string, request: CreateServicerRequest): Promise<Servicer> {
        logger.info("Creating servicer", { employeeId: request.employeeId });

        const servicer: Servicer = {
            organizationId,
            servicerId: randomUUID(),
            employeeId: request.employeeId,
            serviceArea: request.serviceArea,
            maxDailyJobs: request.maxDailyJobs,
            status: "active",
            createdAt: new Date().toISOString(),
        };

        const created = await this.repository.create(servicer);
        metrics.addMetric('ServicersCreated', MetricUnit.Count, 1);
        await this.eventPublisher.publish("ServicerCreated", { organizationId, servicerId: created.servicerId, employeeId: request.employeeId });

        return created;
    }

    async getServicer(organizationId: string, servicerId: string): Promise<Servicer> {
        const servicer = await this.repository.get(organizationId, servicerId);
        if (!servicer) {
            throw new AppError("Servicer not found", 404);
        }
        return servicer;
    }

    async getServicerByEmployeeId(organizationId: string, employeeId: string, options?: PaginationOptions): Promise<PaginatedResult<Servicer>> {
        return this.repository.getByEmployeeId(organizationId, employeeId, options);
    }

    async updateServicer(organizationId: string, servicerId: string, request: UpdateServicerRequest): Promise<Servicer> {
        await this.getServicer(organizationId, servicerId);
        const updated = await this.repository.update(organizationId, servicerId, request);
        return updated;
    }

    async deleteServicer(organizationId: string, servicerId: string): Promise<void> {
        await this.repository.delete(organizationId, servicerId);
        logger.info("Servicer deleted", { servicerId });
    }
}
