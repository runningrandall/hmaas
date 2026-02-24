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

    async createServicer(request: CreateServicerRequest): Promise<Servicer> {
        logger.info("Creating servicer", { employeeId: request.employeeId });

        const servicer: Servicer = {
            servicerId: randomUUID(),
            employeeId: request.employeeId,
            serviceArea: request.serviceArea,
            maxDailyJobs: request.maxDailyJobs,
            status: "active",
            createdAt: new Date().toISOString(),
        };

        const created = await this.repository.create(servicer);
        metrics.addMetric('ServicersCreated', MetricUnit.Count, 1);
        await this.eventPublisher.publish("ServicerCreated", { servicerId: created.servicerId, employeeId: request.employeeId });

        return created;
    }

    async getServicer(servicerId: string): Promise<Servicer> {
        const servicer = await this.repository.get(servicerId);
        if (!servicer) {
            throw new AppError("Servicer not found", 404);
        }
        return servicer;
    }

    async getServicerByEmployeeId(employeeId: string, options?: PaginationOptions): Promise<PaginatedResult<Servicer>> {
        return this.repository.getByEmployeeId(employeeId, options);
    }

    async updateServicer(servicerId: string, request: UpdateServicerRequest): Promise<Servicer> {
        await this.getServicer(servicerId);
        const updated = await this.repository.update(servicerId, request);
        return updated;
    }

    async deleteServicer(servicerId: string): Promise<void> {
        await this.repository.delete(servicerId);
        logger.info("Servicer deleted", { servicerId });
    }
}
