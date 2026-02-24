import { Cost, CreateCostRequest, CostRepository } from "../domain/cost";
import { EventPublisher, PaginationOptions, PaginatedResult } from "../domain/shared";
import { randomUUID } from "crypto";
import { logger, metrics } from "../lib/observability";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { AppError } from "../lib/error";

export class CostService {
    constructor(
        private repository: CostRepository,
        private eventPublisher: EventPublisher
    ) {}

    async createCost(request: CreateCostRequest): Promise<Cost> {
        logger.info("Creating cost", { serviceId: request.serviceId, costTypeId: request.costTypeId });

        const cost: Cost = {
            costId: randomUUID(),
            serviceId: request.serviceId,
            costTypeId: request.costTypeId,
            amount: request.amount,
            description: request.description,
            effectiveDate: request.effectiveDate,
            createdAt: new Date().toISOString(),
        };

        const created = await this.repository.create(cost);
        metrics.addMetric('CostsCreated', MetricUnit.Count, 1);
        await this.eventPublisher.publish("CostAdded", {
            costId: created.costId,
            serviceId: request.serviceId,
            amount: request.amount,
        });

        return created;
    }

    async getCost(costId: string): Promise<Cost> {
        const cost = await this.repository.get(costId);
        if (!cost) {
            throw new AppError("Cost not found", 404);
        }
        return cost;
    }

    async listCostsByService(serviceId: string, options?: PaginationOptions): Promise<PaginatedResult<Cost>> {
        return this.repository.listByServiceId(serviceId, options);
    }

    async deleteCost(costId: string): Promise<void> {
        const cost = await this.getCost(costId);
        await this.repository.delete(costId);
        await this.eventPublisher.publish("CostRemoved", { costId, serviceId: cost.serviceId });
        logger.info("Cost deleted", { costId });
    }
}
