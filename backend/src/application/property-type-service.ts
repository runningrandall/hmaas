import { PropertyType, CreatePropertyTypeRequest, UpdatePropertyTypeRequest, PropertyTypeRepository } from "../domain/property-type";
import { EventPublisher, PaginationOptions, PaginatedResult } from "../domain/shared";
import { randomUUID } from "crypto";
import { logger, metrics } from "../lib/observability";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { AppError } from "../lib/error";

export class PropertyTypeService {
    constructor(
        private repository: PropertyTypeRepository,
        private eventPublisher: EventPublisher
    ) {}

    async createPropertyType(organizationId: string, request: CreatePropertyTypeRequest): Promise<PropertyType> {
        logger.info("Creating property type", { name: request.name });

        const propertyType: PropertyType = {
            organizationId,
            propertyTypeId: randomUUID(),
            name: request.name,
            description: request.description,
            createdAt: new Date().toISOString(),
        };

        const created = await this.repository.create(propertyType);
        metrics.addMetric('PropertyTypesCreated', MetricUnit.Count, 1);

        return created;
    }

    async getPropertyType(organizationId: string, propertyTypeId: string): Promise<PropertyType> {
        const propertyType = await this.repository.get(organizationId, propertyTypeId);
        if (!propertyType) {
            throw new AppError("Property type not found", 404);
        }
        return propertyType;
    }

    async listPropertyTypes(organizationId: string, options?: PaginationOptions): Promise<PaginatedResult<PropertyType>> {
        return this.repository.list(organizationId, options);
    }

    async updatePropertyType(organizationId: string, propertyTypeId: string, request: UpdatePropertyTypeRequest): Promise<PropertyType> {
        await this.getPropertyType(organizationId, propertyTypeId);
        return this.repository.update(organizationId, propertyTypeId, request);
    }

    async deletePropertyType(organizationId: string, propertyTypeId: string): Promise<void> {
        await this.repository.delete(organizationId, propertyTypeId);
        logger.info("Property type deleted", { propertyTypeId });
    }
}
