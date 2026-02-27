import { Property, CreatePropertyRequest, UpdatePropertyRequest, PropertyRepository } from "../domain/property";
import { EventPublisher, PaginationOptions, PaginatedResult } from "../domain/shared";
import { randomUUID } from "crypto";
import { logger, metrics } from "../lib/observability";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { AppError } from "../lib/error";

export class PropertyService {
    constructor(
        private repository: PropertyRepository,
        private eventPublisher: EventPublisher
    ) {}

    async createProperty(organizationId: string, request: CreatePropertyRequest): Promise<Property> {
        logger.info("Creating property", { customerId: request.customerId, name: request.name });

        const property: Property = {
            organizationId,
            propertyId: randomUUID(),
            customerId: request.customerId,
            propertyTypeId: request.propertyTypeId,
            name: request.name,
            address: request.address,
            city: request.city,
            state: request.state,
            zip: request.zip,
            lat: request.lat,
            lng: request.lng,
            lotSize: request.lotSize,
            notes: request.notes,
            status: "active",
            createdAt: new Date().toISOString(),
        };

        const created = await this.repository.create(property);
        metrics.addMetric('PropertiesCreated', MetricUnit.Count, 1);
        await this.eventPublisher.publish("PropertyCreated", { organizationId, propertyId: created.propertyId, customerId: request.customerId });

        return created;
    }

    async getProperty(organizationId: string, propertyId: string): Promise<Property> {
        const property = await this.repository.get(organizationId, propertyId);
        if (!property) {
            throw new AppError("Property not found", 404);
        }
        return property;
    }

    async listPropertiesByCustomer(organizationId: string, customerId: string, options?: PaginationOptions): Promise<PaginatedResult<Property>> {
        return this.repository.listByCustomerId(organizationId, customerId, options);
    }

    async updateProperty(organizationId: string, propertyId: string, request: UpdatePropertyRequest): Promise<Property> {
        const existing = await this.getProperty(organizationId, propertyId);
        const updated = await this.repository.update(organizationId, propertyId, request);

        await this.eventPublisher.publish("PropertyUpdated", {
            organizationId,
            propertyId,
            customerId: existing.customerId,
        });

        return updated;
    }

    async deleteProperty(organizationId: string, propertyId: string): Promise<void> {
        await this.repository.delete(organizationId, propertyId);
        logger.info("Property deleted", { propertyId });
    }
}
