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

    async createServiceType(organizationId: string, request: CreateServiceTypeRequest): Promise<ServiceType> {
        logger.info("Creating service type", { name: request.name });

        const serviceType: ServiceType = {
            organizationId,
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

    async getServiceType(organizationId: string, serviceTypeId: string): Promise<ServiceType> {
        const serviceType = await this.repository.get(organizationId, serviceTypeId);
        if (!serviceType) {
            throw new AppError("Service type not found", 404);
        }
        return serviceType;
    }

    async listServiceTypes(organizationId: string, options?: PaginationOptions): Promise<PaginatedResult<ServiceType>> {
        return this.repository.list(organizationId, options);
    }

    async updateServiceType(organizationId: string, serviceTypeId: string, request: UpdateServiceTypeRequest): Promise<ServiceType> {
        await this.getServiceType(organizationId, serviceTypeId);
        return this.repository.update(organizationId, serviceTypeId, request);
    }

    async deleteServiceType(organizationId: string, serviceTypeId: string): Promise<void> {
        await this.repository.delete(organizationId, serviceTypeId);
        logger.info("Service type deleted", { serviceTypeId });
    }
}
