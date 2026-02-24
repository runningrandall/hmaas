import { CostType, CreateCostTypeRequest, UpdateCostTypeRequest, CostTypeRepository } from "../domain/cost-type";
import { EventPublisher, PaginationOptions, PaginatedResult } from "../domain/shared";
import { randomUUID } from "crypto";
import { logger, metrics } from "../lib/observability";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { AppError } from "../lib/error";

export class CostTypeService {
    constructor(
        private repository: CostTypeRepository,
        private eventPublisher: EventPublisher
    ) {}

    async createCostType(request: CreateCostTypeRequest): Promise<CostType> {
        logger.info("Creating cost type", { name: request.name });

        const costType: CostType = {
            costTypeId: randomUUID(),
            name: request.name,
            description: request.description,
            createdAt: new Date().toISOString(),
        };

        const created = await this.repository.create(costType);
        metrics.addMetric('CostTypesCreated', MetricUnit.Count, 1);
        return created;
    }

    async getCostType(costTypeId: string): Promise<CostType> {
        const costType = await this.repository.get(costTypeId);
        if (!costType) {
            throw new AppError("Cost type not found", 404);
        }
        return costType;
    }

    async listCostTypes(options?: PaginationOptions): Promise<PaginatedResult<CostType>> {
        return this.repository.list(options);
    }

    async updateCostType(costTypeId: string, request: UpdateCostTypeRequest): Promise<CostType> {
        await this.getCostType(costTypeId);
        return this.repository.update(costTypeId, request);
    }

    async deleteCostType(costTypeId: string): Promise<void> {
        await this.repository.delete(costTypeId);
        logger.info("Cost type deleted", { costTypeId });
    }
}
