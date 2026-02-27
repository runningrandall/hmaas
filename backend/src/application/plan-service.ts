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

    async createPlan(organizationId: string, request: CreatePlanRequest): Promise<Plan> {
        logger.info("Creating plan", { name: request.name });

        const plan: Plan = {
            organizationId,
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
        await this.eventPublisher.publish("PlanCreated", { organizationId, planId: created.planId });

        return created;
    }

    async getPlan(organizationId: string, planId: string): Promise<Plan> {
        const plan = await this.repository.get(organizationId, planId);
        if (!plan) {
            throw new AppError("Plan not found", 404);
        }
        return plan;
    }

    async listPlans(organizationId: string, options?: PaginationOptions): Promise<PaginatedResult<Plan>> {
        return this.repository.list(organizationId, options);
    }

    async updatePlan(organizationId: string, planId: string, request: UpdatePlanRequest): Promise<Plan> {
        await this.getPlan(organizationId, planId);
        return this.repository.update(organizationId, planId, request);
    }

    async deletePlan(organizationId: string, planId: string): Promise<void> {
        await this.repository.delete(organizationId, planId);
        logger.info("Plan deleted", { planId });
    }
}
