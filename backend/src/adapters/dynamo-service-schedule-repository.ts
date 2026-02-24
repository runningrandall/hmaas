import { ServiceScheduleRepository, ServiceSchedule, UpdateServiceScheduleRequest } from "../domain/service-schedule";
import { PaginationOptions, PaginatedResult } from "../domain/shared";
import { DBService } from "../entities/service";
import { z } from "zod";
import { logger } from "../lib/observability";

const DynamoServiceScheduleSchema = z.object({
    serviceScheduleId: z.string(),
    serviceId: z.string(),
    servicerId: z.string(),
    scheduledDate: z.string(),
    scheduledTime: z.string().optional().nullable(),
    estimatedDuration: z.number().optional().nullable(),
    status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]),
    completedAt: z.string().optional().nullable(),
    createdAt: z.union([z.string(), z.number()]).transform(v => String(v)),
    updatedAt: z.union([z.string(), z.number()]).optional().transform(v => v != null ? String(v) : undefined),
}).passthrough();

function parseServiceSchedule(data: unknown): ServiceSchedule {
    const result = DynamoServiceScheduleSchema.safeParse(data);
    if (!result.success) {
        logger.error("Data validation failed reading from DynamoDB", { errors: result.error.issues, data });
        throw new Error(`Data integrity error: ${result.error.message}`);
    }
    return result.data as ServiceSchedule;
}

const DEFAULT_PAGE_SIZE = 20;

export class DynamoServiceScheduleRepository implements ServiceScheduleRepository {
    async create(schedule: ServiceSchedule): Promise<ServiceSchedule> {
        const { createdAt, updatedAt, ...data } = schedule;
        const result = await DBService.entities.serviceSchedule.create(data).go();
        return parseServiceSchedule(result.data);
    }

    async get(serviceScheduleId: string): Promise<ServiceSchedule | null> {
        const result = await DBService.entities.serviceSchedule.get({ serviceScheduleId }).go();
        if (!result.data) return null;
        return parseServiceSchedule(result.data);
    }

    async listByServicerId(servicerId: string, options?: PaginationOptions): Promise<PaginatedResult<ServiceSchedule>> {
        const limit = options?.limit || DEFAULT_PAGE_SIZE;
        const result = await DBService.entities.serviceSchedule.query.byServicerId({ servicerId }).go({
            limit,
            ...(options?.cursor && { cursor: options.cursor }),
        });
        return {
            items: result.data.map(parseServiceSchedule),
            cursor: result.cursor ?? null,
        };
    }

    async update(serviceScheduleId: string, data: UpdateServiceScheduleRequest): Promise<ServiceSchedule> {
        const result = await DBService.entities.serviceSchedule.patch({ serviceScheduleId }).set(data).go({ response: "all_new" });
        return parseServiceSchedule(result.data);
    }
}
