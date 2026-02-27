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

    async createInvoiceSchedule(organizationId: string, request: CreateInvoiceScheduleRequest): Promise<InvoiceSchedule> {
        logger.info("Creating invoice schedule", { customerId: request.customerId, frequency: request.frequency });

        const schedule: InvoiceSchedule = {
            organizationId,
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
            organizationId,
            invoiceScheduleId: created.invoiceScheduleId,
            customerId: request.customerId,
        });

        return created;
    }

    async getInvoiceSchedule(organizationId: string, invoiceScheduleId: string): Promise<InvoiceSchedule> {
        const schedule = await this.repository.get(organizationId, invoiceScheduleId);
        if (!schedule) {
            throw new AppError("Invoice schedule not found", 404);
        }
        return schedule;
    }

    async listInvoiceSchedulesByCustomer(organizationId: string, customerId: string, options?: PaginationOptions): Promise<PaginatedResult<InvoiceSchedule>> {
        return this.repository.listByCustomerId(organizationId, customerId, options);
    }

    async updateInvoiceSchedule(organizationId: string, invoiceScheduleId: string, request: UpdateInvoiceScheduleRequest): Promise<InvoiceSchedule> {
        await this.getInvoiceSchedule(organizationId, invoiceScheduleId);
        const updated = await this.repository.update(organizationId, invoiceScheduleId, request);

        await this.eventPublisher.publish("InvoiceScheduleUpdated", {
            organizationId,
            invoiceScheduleId,
            customerId: updated.customerId,
        });

        return updated;
    }

    async deleteInvoiceSchedule(organizationId: string, invoiceScheduleId: string): Promise<void> {
        const schedule = await this.getInvoiceSchedule(organizationId, invoiceScheduleId);
        await this.repository.delete(organizationId, invoiceScheduleId);
        await this.eventPublisher.publish("InvoiceScheduleDeleted", {
            organizationId,
            invoiceScheduleId,
            customerId: schedule.customerId,
        });
        logger.info("Invoice schedule deleted", { invoiceScheduleId });
    }
}
