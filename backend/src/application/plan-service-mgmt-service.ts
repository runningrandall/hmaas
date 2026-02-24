import { PlanService, CreatePlanServiceRequest, PlanServiceRepository } from "../domain/plan-service";
import { EventPublisher, PaginationOptions, PaginatedResult } from "../domain/shared";
import { logger, metrics } from "../lib/observability";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { AppError } from "../lib/error";

export class PlanServiceMgmtService {
    constructor(
        private repository: PlanServiceRepository,
        private eventPublisher: EventPublisher
    ) {}

    async createPlanService(request: CreatePlanServiceRequest): Promise<PlanService> {
        logger.info("Adding service to plan", { planId: request.planId, serviceTypeId: request.serviceTypeId });

        const planService: PlanService = {
            planId: request.planId,
            serviceTypeId: request.serviceTypeId,
            includedVisits: request.includedVisits,
            frequency: request.frequency,
            createdAt: new Date().toISOString(),
        };

        const created = await this.repository.create(planService);
        metrics.addMetric('PlanServicesCreated', MetricUnit.Count, 1);
        await this.eventPublisher.publish("PlanServiceAdded", { planId: request.planId, serviceTypeId: request.serviceTypeId });

        return created;
    }

    async getPlanService(planId: string, serviceTypeId: string): Promise<PlanService> {
        const planService = await this.repository.get(planId, serviceTypeId);
        if (!planService) {
            throw new AppError("Plan service not found", 404);
        }
        return planService;
    }

    async listPlanServices(planId: string, options?: PaginationOptions): Promise<PaginatedResult<PlanService>> {
        return this.repository.listByPlanId(planId, options);
    }

    async deletePlanService(planId: string, serviceTypeId: string): Promise<void> {
        await this.repository.delete(planId, serviceTypeId);
        await this.eventPublisher.publish("PlanServiceRemoved", { planId, serviceTypeId });
        logger.info("Plan service deleted", { planId, serviceTypeId });
    }
}
