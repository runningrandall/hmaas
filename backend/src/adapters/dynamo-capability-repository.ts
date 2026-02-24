import { CapabilityRepository, Capability } from "../domain/capability";
import { PaginationOptions, PaginatedResult } from "../domain/shared";
import { DBService } from "../entities/service";
import { z } from "zod";
import { logger } from "../lib/observability";

const DynamoCapabilitySchema = z.object({
    capabilityId: z.string(),
    employeeId: z.string(),
    serviceTypeId: z.string(),
    level: z.enum(["beginner", "intermediate", "expert"]),
    certificationDate: z.string().optional().nullable(),
    createdAt: z.union([z.string(), z.number()]).transform(v => String(v)),
    updatedAt: z.union([z.string(), z.number()]).optional().transform(v => v != null ? String(v) : undefined),
}).passthrough();

function parseCapability(data: unknown): Capability {
    const result = DynamoCapabilitySchema.safeParse(data);
    if (!result.success) {
        logger.error("Data validation failed reading from DynamoDB", { errors: result.error.issues, data });
        throw new Error(`Data integrity error: ${result.error.message}`);
    }
    return result.data as Capability;
}

const DEFAULT_PAGE_SIZE = 20;

export class DynamoCapabilityRepository implements CapabilityRepository {
    async create(capability: Capability): Promise<Capability> {
        const { createdAt, updatedAt, ...data } = capability;
        const result = await DBService.entities.capability.create(data).go();
        return parseCapability(result.data);
    }

    async get(capabilityId: string): Promise<Capability | null> {
        const result = await DBService.entities.capability.get({ capabilityId }).go();
        if (!result.data) return null;
        return parseCapability(result.data);
    }

    async listByEmployeeId(employeeId: string, options?: PaginationOptions): Promise<PaginatedResult<Capability>> {
        const limit = options?.limit || DEFAULT_PAGE_SIZE;
        const result = await DBService.entities.capability.query.byEmployeeId({ employeeId }).go({
            limit,
            ...(options?.cursor && { cursor: options.cursor }),
        });
        return {
            items: result.data.map(parseCapability),
            cursor: result.cursor ?? null,
        };
    }

    async delete(capabilityId: string): Promise<void> {
        await DBService.entities.capability.delete({ capabilityId }).go();
    }
}
