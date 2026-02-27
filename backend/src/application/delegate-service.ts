import { Delegate, CreateDelegateRequest, DelegateRepository } from "../domain/delegate";
import { EventPublisher, PaginationOptions, PaginatedResult } from "../domain/shared";
import { randomUUID } from "crypto";
import { logger, metrics } from "../lib/observability";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { AppError } from "../lib/error";

export class DelegateService {
    constructor(
        private repository: DelegateRepository,
        private eventPublisher: EventPublisher
    ) {}

    async createDelegate(organizationId: string, request: CreateDelegateRequest): Promise<Delegate> {
        logger.info("Creating delegate", { accountId: request.accountId, email: request.email });

        const delegate: Delegate = {
            organizationId,
            delegateId: randomUUID(),
            accountId: request.accountId,
            email: request.email,
            name: request.name,
            permissions: request.permissions,
            status: "active",
            createdAt: new Date().toISOString(),
        };

        const created = await this.repository.create(delegate);
        metrics.addMetric('DelegatesCreated', MetricUnit.Count, 1);
        await this.eventPublisher.publish("DelegateAdded", { organizationId, delegateId: created.delegateId, accountId: request.accountId });

        return created;
    }

    async getDelegate(organizationId: string, delegateId: string): Promise<Delegate> {
        const delegate = await this.repository.get(organizationId, delegateId);
        if (!delegate) {
            throw new AppError("Delegate not found", 404);
        }
        return delegate;
    }

    async listDelegatesByAccount(organizationId: string, accountId: string, options?: PaginationOptions): Promise<PaginatedResult<Delegate>> {
        return this.repository.listByAccountId(organizationId, accountId, options);
    }

    async deleteDelegate(organizationId: string, delegateId: string): Promise<void> {
        const delegate = await this.getDelegate(organizationId, delegateId);
        await this.repository.delete(organizationId, delegateId);
        await this.eventPublisher.publish("DelegateRemoved", { organizationId, delegateId, accountId: delegate.accountId });
        logger.info("Delegate deleted", { delegateId });
    }
}
