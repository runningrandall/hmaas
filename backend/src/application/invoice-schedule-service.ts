import { InvoiceSchedule, CreateInvoiceScheduleRequest, UpdateInvoiceScheduleRequest, InvoiceScheduleRepository } from "../domain/invoice-schedule";
import { EventPublisher, PaginationOptions, PaginatedResult } from "../domain/shared";
import { randomUUID } from "crypto";
import { logger, metrics } from "../lib/observability";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { AppError } from "../lib/error";

export class InvoiceScheduleService {
    constructor(
        private repository: InvoiceScheduleRepository,
        private eventPublisher: EventPublisher
    ) {}

    async createInvoiceSchedule(request: CreateInvoiceScheduleRequest): Promise<InvoiceSchedule> {
        logger.info("Creating invoice schedule", { customerId: request.customerId, frequency: request.frequency });

        const schedule: InvoiceSchedule = {
            invoiceScheduleId: randomUUID(),
            customerId: request.customerId,
            frequency: request.frequency,
            nextInvoiceDate: request.nextInvoiceDate,
            dayOfMonth: request.dayOfMonth,
            createdAt: new Date().toISOString(),
        };

        const created = await this.repository.create(schedule);
        metrics.addMetric('InvoiceSchedulesCreated', MetricUnit.Count, 1);
        await this.eventPublisher.publish("InvoiceScheduleCreated", {
            invoiceScheduleId: created.invoiceScheduleId,
            customerId: request.customerId,
        });

        return created;
    }

    async getInvoiceSchedule(invoiceScheduleId: string): Promise<InvoiceSchedule> {
        const schedule = await this.repository.get(invoiceScheduleId);
        if (!schedule) {
            throw new AppError("Invoice schedule not found", 404);
        }
        return schedule;
    }

    async listInvoiceSchedulesByCustomer(customerId: string, options?: PaginationOptions): Promise<PaginatedResult<InvoiceSchedule>> {
        return this.repository.listByCustomerId(customerId, options);
    }

    async updateInvoiceSchedule(invoiceScheduleId: string, request: UpdateInvoiceScheduleRequest): Promise<InvoiceSchedule> {
        await this.getInvoiceSchedule(invoiceScheduleId);
        const updated = await this.repository.update(invoiceScheduleId, request);

        await this.eventPublisher.publish("InvoiceScheduleUpdated", {
            invoiceScheduleId,
            customerId: updated.customerId,
        });

        return updated;
    }

    async deleteInvoiceSchedule(invoiceScheduleId: string): Promise<void> {
        const schedule = await this.getInvoiceSchedule(invoiceScheduleId);
        await this.repository.delete(invoiceScheduleId);
        await this.eventPublisher.publish("InvoiceScheduleDeleted", {
            invoiceScheduleId,
            customerId: schedule.customerId,
        });
        logger.info("Invoice schedule deleted", { invoiceScheduleId });
    }
}
