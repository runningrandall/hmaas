import { ServiceSchedule, CreateServiceScheduleRequest, UpdateServiceScheduleRequest, ServiceScheduleRepository } from "../domain/service-schedule";
import { EventPublisher, PaginationOptions, PaginatedResult } from "../domain/shared";
import { randomUUID } from "crypto";
import { logger, metrics } from "../lib/observability";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { AppError } from "../lib/error";

export class ServiceScheduleService {
    constructor(
        private repository: ServiceScheduleRepository,
        private eventPublisher: EventPublisher
    ) {}

    async createServiceSchedule(request: CreateServiceScheduleRequest): Promise<ServiceSchedule> {
        logger.info("Creating service schedule", { serviceId: request.serviceId, servicerId: request.servicerId });

        const schedule: ServiceSchedule = {
            serviceScheduleId: randomUUID(),
            serviceId: request.serviceId,
            servicerId: request.servicerId,
            scheduledDate: request.scheduledDate,
            scheduledTime: request.scheduledTime,
            estimatedDuration: request.estimatedDuration,
            status: "scheduled",
            createdAt: new Date().toISOString(),
        };

        const created = await this.repository.create(schedule);
        metrics.addMetric('ServiceSchedulesCreated', MetricUnit.Count, 1);
        await this.eventPublisher.publish("ServiceScheduleCreated", {
            serviceScheduleId: created.serviceScheduleId,
            serviceId: request.serviceId,
            servicerId: request.servicerId,
        });

        return created;
    }

    async getServiceSchedule(serviceScheduleId: string): Promise<ServiceSchedule> {
        const schedule = await this.repository.get(serviceScheduleId);
        if (!schedule) {
            throw new AppError("Service schedule not found", 404);
        }
        return schedule;
    }

    async listByServicerId(servicerId: string, options?: PaginationOptions): Promise<PaginatedResult<ServiceSchedule>> {
        return this.repository.listByServicerId(servicerId, options);
    }

    async updateServiceSchedule(serviceScheduleId: string, request: UpdateServiceScheduleRequest): Promise<ServiceSchedule> {
        const existing = await this.getServiceSchedule(serviceScheduleId);
        const updated = await this.repository.update(serviceScheduleId, request);

        if (request.status === "completed" && existing.status !== "completed") {
            await this.eventPublisher.publish("ServiceScheduleCompleted", {
                serviceScheduleId,
                serviceId: existing.serviceId,
                servicerId: existing.servicerId,
            });
        }

        return updated;
    }
}
