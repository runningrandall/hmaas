import { ServiceType, CreateServiceTypeRequest, UpdateServiceTypeRequest, ServiceTypeRepository } from "../domain/service-type";
import { EventPublisher, PaginationOptions, PaginatedResult } from "../domain/shared";
import { randomUUID } from "crypto";
import { logger, metrics } from "../lib/observability";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { AppError } from "../lib/error";

export class ServiceTypeService {
    constructor(
        private repository: ServiceTypeRepository,
        private eventPublisher: EventPublisher
    ) {}

    async createServiceType(request: CreateServiceTypeRequest): Promise<ServiceType> {
        logger.info("Creating service type", { name: request.name });

        const serviceType: ServiceType = {
            serviceTypeId: randomUUID(),
            name: request.name,
            description: request.description,
            category: request.category,
            createdAt: new Date().toISOString(),
        };

        const created = await this.repository.create(serviceType);
        metrics.addMetric('ServiceTypesCreated', MetricUnit.Count, 1);
        return created;
    }

    async getServiceType(serviceTypeId: string): Promise<ServiceType> {
        const serviceType = await this.repository.get(serviceTypeId);
        if (!serviceType) {
            throw new AppError("Service type not found", 404);
        }
        return serviceType;
    }

    async listServiceTypes(options?: PaginationOptions): Promise<PaginatedResult<ServiceType>> {
        return this.repository.list(options);
    }

    async updateServiceType(serviceTypeId: string, request: UpdateServiceTypeRequest): Promise<ServiceType> {
        await this.getServiceType(serviceTypeId);
        return this.repository.update(serviceTypeId, request);
    }

    async deleteServiceType(serviceTypeId: string): Promise<void> {
        await this.repository.delete(serviceTypeId);
        logger.info("Service type deleted", { serviceTypeId });
    }
}
