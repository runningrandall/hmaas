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

    async createPropertyService(organizationId: string, request: CreatePropertyServiceRequest): Promise<PropertyService> {
        logger.info("Creating property service", { propertyId: request.propertyId, serviceTypeId: request.serviceTypeId });

        const propertyService: PropertyService = {
            organizationId,
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
            organizationId,
            serviceId: created.serviceId,
            propertyId: request.propertyId,
            serviceTypeId: request.serviceTypeId,
        });

        return created;
    }

    async getPropertyService(organizationId: string, serviceId: string): Promise<PropertyService> {
        const propertyService = await this.repository.get(organizationId, serviceId);
        if (!propertyService) {
            throw new AppError("Property service not found", 404);
        }
        return propertyService;
    }

    async listPropertyServicesByProperty(organizationId: string, propertyId: string, options?: PaginationOptions): Promise<PaginatedResult<PropertyService>> {
        return this.repository.listByPropertyId(organizationId, propertyId, options);
    }

    async updatePropertyService(organizationId: string, serviceId: string, request: UpdatePropertyServiceRequest): Promise<PropertyService> {
        const existing = await this.getPropertyService(organizationId, serviceId);
        const updated = await this.repository.update(organizationId, serviceId, request);

        if (request.status && request.status !== existing.status) {
            if (request.status === "cancelled") {
                await this.eventPublisher.publish("PropertyServiceCancelled", {
                    organizationId,
                    serviceId,
                    propertyId: existing.propertyId,
                    serviceTypeId: existing.serviceTypeId,
                });
            } else if (request.status === "active" && existing.status !== "active") {
                await this.eventPublisher.publish("PropertyServiceActivated", {
                    organizationId,
                    serviceId,
                    propertyId: existing.propertyId,
                    serviceTypeId: existing.serviceTypeId,
                });
            }
        }

        return updated;
    }

    async deletePropertyService(organizationId: string, serviceId: string): Promise<void> {
        const existing = await this.getPropertyService(organizationId, serviceId);
        await this.repository.delete(organizationId, serviceId);
        await this.eventPublisher.publish("PropertyServiceCancelled", {
            organizationId,
            serviceId,
            propertyId: existing.propertyId,
            serviceTypeId: existing.serviceTypeId,
        });
        logger.info("Property service deleted", { serviceId });
    }
}
