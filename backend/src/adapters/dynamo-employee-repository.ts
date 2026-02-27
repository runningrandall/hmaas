import { EmployeeRepository, Employee, UpdateEmployeeRequest } from "../domain/employee";
import { PaginationOptions, PaginatedResult } from "../domain/shared";
import { DBService } from "../entities/service";
import { z } from "zod";
import { logger } from "../lib/observability";

const DynamoEmployeeSchema = z.object({
    organizationId: z.string(),
    employeeId: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    email: z.string(),
    phone: z.string().optional().nullable(),
    role: z.string(),
    status: z.enum(["active", "inactive", "terminated"]),
    hireDate: z.string().optional().nullable(),
    createdAt: z.union([z.string(), z.number()]).transform(v => String(v)),
    updatedAt: z.union([z.string(), z.number()]).optional().transform(v => v != null ? String(v) : undefined),
}).passthrough();

function parseEmployee(data: unknown): Employee {
    const result = DynamoEmployeeSchema.safeParse(data);
    if (!result.success) {
        logger.error("Data validation failed reading from DynamoDB", { errors: result.error.issues, data });
        throw new Error(`Data integrity error: ${result.error.message}`);
    }
    return result.data as Employee;
}

const DEFAULT_PAGE_SIZE = 20;

export class DynamoEmployeeRepository implements EmployeeRepository {
    async create(employee: Employee): Promise<Employee> {
        const { createdAt, updatedAt, ...data } = employee;
        const result = await DBService.entities.employee.create(data).go();
        return parseEmployee(result.data);
    }

    async get(organizationId: string, employeeId: string): Promise<Employee | null> {
        const result = await DBService.entities.employee.get({ organizationId, employeeId }).go();
        if (!result.data) return null;
        return parseEmployee(result.data);
    }

    async list(organizationId: string, options?: PaginationOptions): Promise<PaginatedResult<Employee>> {
        const limit = options?.limit || DEFAULT_PAGE_SIZE;
        const result = await DBService.entities.employee.query.byEmployeeId({ organizationId }).go({
            limit,
            ...(options?.cursor && { cursor: options.cursor }),
        });
        return {
            items: result.data.map(parseEmployee),
            cursor: result.cursor ?? null,
        };
    }

    async update(organizationId: string, employeeId: string, data: UpdateEmployeeRequest): Promise<Employee> {
        const result = await DBService.entities.employee.patch({ organizationId, employeeId }).set(data).go({ response: "all_new" });
        return parseEmployee(result.data);
    }

    async delete(organizationId: string, employeeId: string): Promise<void> {
        await DBService.entities.employee.delete({ organizationId, employeeId }).go();
    }
}
