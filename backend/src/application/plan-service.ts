import { Plan, CreatePlanRequest, UpdatePlanRequest, PlanRepository } from "../domain/plan";
import { EventPublisher, PaginationOptions, PaginatedResult } from "../domain/shared";
import { randomUUID } from "crypto";
import { logger, metrics } from "../lib/observability";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { AppError } from "../lib/error";

export class PlanAppService {
    constructor(
        private repository: PlanRepository,
        private eventPublisher: EventPublisher
    ) {}

    async createPlan(request: CreatePlanRequest): Promise<Plan> {
        logger.info("Creating plan", { name: request.name });

        const plan: Plan = {
            planId: randomUUID(),
            name: request.name,
            description: request.description,
            monthlyPrice: request.monthlyPrice,
            annualPrice: request.annualPrice,
            status: request.status || "active",
            createdAt: new Date().toISOString(),
        };

        const created = await this.repository.create(plan);
        metrics.addMetric('PlansCreated', MetricUnit.Count, 1);
        await this.eventPublisher.publish("PlanCreated", { planId: created.planId });

        return created;
    }

    async getPlan(planId: string): Promise<Plan> {
        const plan = await this.repository.get(planId);
        if (!plan) {
            throw new AppError("Plan not found", 404);
        }
        return plan;
    }

    async listPlans(options?: PaginationOptions): Promise<PaginatedResult<Plan>> {
        return this.repository.list(options);
    }

    async updatePlan(planId: string, request: UpdatePlanRequest): Promise<Plan> {
        await this.getPlan(planId);
        return this.repository.update(planId, request);
    }

    async deletePlan(planId: string): Promise<void> {
        await this.repository.delete(planId);
        logger.info("Plan deleted", { planId });
    }
}
