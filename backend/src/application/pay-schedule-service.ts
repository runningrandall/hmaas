import { PaySchedule, CreatePayScheduleRequest, UpdatePayScheduleRequest, PayScheduleRepository } from "../domain/pay-schedule";
import { PaginationOptions, PaginatedResult } from "../domain/shared";
import { randomUUID } from "crypto";
import { logger, metrics } from "../lib/observability";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { AppError } from "../lib/error";

export class PayScheduleService {
    constructor(
        private repository: PayScheduleRepository,
    ) {}

    async createPaySchedule(request: CreatePayScheduleRequest): Promise<PaySchedule> {
        logger.info("Creating pay schedule", { name: request.name, frequency: request.frequency });

        const paySchedule: PaySchedule = {
            payScheduleId: randomUUID(),
            name: request.name,
            frequency: request.frequency,
            dayOfWeek: request.dayOfWeek,
            dayOfMonth: request.dayOfMonth,
            createdAt: new Date().toISOString(),
        };

        const created = await this.repository.create(paySchedule);
        metrics.addMetric('PaySchedulesCreated', MetricUnit.Count, 1);

        return created;
    }

    async getPaySchedule(payScheduleId: string): Promise<PaySchedule> {
        const paySchedule = await this.repository.get(payScheduleId);
        if (!paySchedule) {
            throw new AppError("Pay schedule not found", 404);
        }
        return paySchedule;
    }

    async listPaySchedules(options?: PaginationOptions): Promise<PaginatedResult<PaySchedule>> {
        return this.repository.list(options);
    }

    async updatePaySchedule(payScheduleId: string, request: UpdatePayScheduleRequest): Promise<PaySchedule> {
        await this.getPaySchedule(payScheduleId);
        return this.repository.update(payScheduleId, request);
    }

    async deletePaySchedule(payScheduleId: string): Promise<void> {
        await this.repository.delete(payScheduleId);
        logger.info("Pay schedule deleted", { payScheduleId });
    }
}
