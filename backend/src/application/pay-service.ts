import { Pay, CreatePayRequest, UpdatePayRequest, PayRepository } from "../domain/pay";
import { PaginationOptions, PaginatedResult } from "../domain/shared";
import { randomUUID } from "crypto";
import { logger, metrics } from "../lib/observability";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { AppError } from "../lib/error";

export class PayService {
    constructor(
        private repository: PayRepository,
    ) {}

    async createPay(organizationId: string, request: CreatePayRequest): Promise<Pay> {
        logger.info("Creating pay record", { employeeId: request.employeeId, payType: request.payType });

        const pay: Pay = {
            organizationId,
            payId: randomUUID(),
            employeeId: request.employeeId,
            payScheduleId: request.payScheduleId,
            payType: request.payType,
            rate: request.rate,
            effectiveDate: request.effectiveDate,
            createdAt: new Date().toISOString(),
        };

        const created = await this.repository.create(pay);
        metrics.addMetric('PayRecordsCreated', MetricUnit.Count, 1);

        return created;
    }

    async getPay(organizationId: string, payId: string): Promise<Pay> {
        const pay = await this.repository.get(organizationId, payId);
        if (!pay) {
            throw new AppError("Pay record not found", 404);
        }
        return pay;
    }

    async listPayByEmployee(organizationId: string, employeeId: string, options?: PaginationOptions): Promise<PaginatedResult<Pay>> {
        return this.repository.listByEmployeeId(organizationId, employeeId, options);
    }

    async updatePay(organizationId: string, payId: string, request: UpdatePayRequest): Promise<Pay> {
        await this.getPay(organizationId, payId);
        return this.repository.update(organizationId, payId, request);
    }

    async deletePay(organizationId: string, payId: string): Promise<void> {
        await this.repository.delete(organizationId, payId);
        logger.info("Pay record deleted", { payId });
    }
}
