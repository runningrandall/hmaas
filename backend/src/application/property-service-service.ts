import { PropertyService, CreatePropertyServiceRequest, UpdatePropertyServiceRequest, PropertyServiceRepository } from "../domain/property-service";
import { EventPublisher, PaginationOptions, PaginatedResult } from "../domain/shared";
import { randomUUID } from "crypto";
import { logger, metrics } from "../lib/observability";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { AppError } from "../lib/error";

export class PropertyServiceService {
    constructor(
        private repository: PropertyServiceRepository,
        private eventPublisher: EventPublisher
    ) {}

    async createPropertyService(request: CreatePropertyServiceRequest): Promise<PropertyService> {
        logger.info("Creating property service", { propertyId: request.propertyId, serviceTypeId: request.serviceTypeId });

        const propertyService: PropertyService = {
            serviceId: randomUUID(),
            propertyId: request.propertyId,
            serviceTypeId: request.serviceTypeId,
            planId: request.planId,
            status: "active",
            startDate: request.startDate,
            endDate: request.endDate,
            frequency: request.frequency,
            createdAt: new Date().toISOString(),
        };

        const created = await this.repository.create(propertyService);
        metrics.addMetric('PropertyServicesCreated', MetricUnit.Count, 1);
        await this.eventPublisher.publish("PropertyServiceActivated", {
            serviceId: created.serviceId,
            propertyId: request.propertyId,
            serviceTypeId: request.serviceTypeId,
        });

        return created;
    }

    async getPropertyService(serviceId: string): Promise<PropertyService> {
        const propertyService = await this.repository.get(serviceId);
        if (!propertyService) {
            throw new AppError("Property service not found", 404);
        }
        return propertyService;
    }

    async listPropertyServicesByProperty(propertyId: string, options?: PaginationOptions): Promise<PaginatedResult<PropertyService>> {
        return this.repository.listByPropertyId(propertyId, options);
    }

    async updatePropertyService(serviceId: string, request: UpdatePropertyServiceRequest): Promise<PropertyService> {
        const existing = await this.getPropertyService(serviceId);
        const updated = await this.repository.update(serviceId, request);

        if (request.status && request.status !== existing.status) {
            if (request.status === "cancelled") {
                await this.eventPublisher.publish("PropertyServiceCancelled", {
                    serviceId,
                    propertyId: existing.propertyId,
                    serviceTypeId: existing.serviceTypeId,
                });
            } else if (request.status === "active" && existing.status !== "active") {
                await this.eventPublisher.publish("PropertyServiceActivated", {
                    serviceId,
                    propertyId: existing.propertyId,
                    serviceTypeId: existing.serviceTypeId,
                });
            }
        }

        return updated;
    }

    async deletePropertyService(serviceId: string): Promise<void> {
        const existing = await this.getPropertyService(serviceId);
        await this.repository.delete(serviceId);
        await this.eventPublisher.publish("PropertyServiceCancelled", {
            serviceId,
            propertyId: existing.propertyId,
            serviceTypeId: existing.serviceTypeId,
        });
        logger.info("Property service deleted", { serviceId });
    }
}
