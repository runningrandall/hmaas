import { ServiceTypeRepository, ServiceType, UpdateServiceTypeRequest } from "../domain/service-type";
import { PaginationOptions, PaginatedResult } from "../domain/shared";
import { DBService } from "../entities/service";
import { z } from "zod";
import { logger } from "../lib/observability";

const DynamoServiceTypeSchema = z.object({
    serviceTypeId: z.string(),
    name: z.string(),
    description: z.string().optional().nullable(),
    category: z.string().optional().nullable(),
    createdAt: z.union([z.string(), z.number()]).transform(v => String(v)),
    updatedAt: z.union([z.string(), z.number()]).optional().transform(v => v != null ? String(v) : undefined),
}).passthrough();

function parseServiceType(data: unknown): ServiceType {
    const result = DynamoServiceTypeSchema.safeParse(data);
    if (!result.success) {
        logger.error("Data validation failed reading from DynamoDB", { errors: result.error.issues, data });
        throw new Error(`Data integrity error: ${result.error.message}`);
    }
    return result.data as ServiceType;
}

const DEFAULT_PAGE_SIZE = 20;

export class DynamoServiceTypeRepository implements ServiceTypeRepository {
    async create(serviceType: ServiceType): Promise<ServiceType> {
        const { createdAt, updatedAt, ...data } = serviceType;
        const result = await DBService.entities.serviceType.create(data).go();
        return parseServiceType(result.data);
    }

    async get(serviceTypeId: string): Promise<ServiceType | null> {
        const result = await DBService.entities.serviceType.get({ serviceTypeId }).go();
        if (!result.data) return null;
        return parseServiceType(result.data);
    }

    async list(options?: PaginationOptions): Promise<PaginatedResult<ServiceType>> {
        const limit = options?.limit || DEFAULT_PAGE_SIZE;
        const result = await DBService.entities.serviceType.scan.go({
            limit,
            ...(options?.cursor && { cursor: options.cursor }),
        });
        return {
            items: result.data.map(parseServiceType),
            cursor: result.cursor ?? null,
        };
    }

    async update(serviceTypeId: string, data: UpdateServiceTypeRequest): Promise<ServiceType> {
        const result = await DBService.entities.serviceType.patch({ serviceTypeId }).set(data).go({ response: "all_new" });
        return parseServiceType(result.data);
    }

    async delete(serviceTypeId: string): Promise<void> {
        await DBService.entities.serviceType.delete({ serviceTypeId }).go();
    }
}
