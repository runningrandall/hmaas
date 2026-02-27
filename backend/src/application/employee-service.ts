import { Employee, CreateEmployeeRequest, UpdateEmployeeRequest, EmployeeRepository } from "../domain/employee";
import { EventPublisher, PaginationOptions, PaginatedResult } from "../domain/shared";
import { randomUUID } from "crypto";
import { logger, metrics } from "../lib/observability";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { AppError } from "../lib/error";

export class EmployeeService {
    constructor(
        private repository: EmployeeRepository,
        private eventPublisher: EventPublisher
    ) {}

    async createEmployee(organizationId: string, request: CreateEmployeeRequest): Promise<Employee> {
        logger.info("Creating employee", { email: request.email });

        const employee: Employee = {
            organizationId,
            employeeId: randomUUID(),
            firstName: request.firstName,
            lastName: request.lastName,
            email: request.email,
            phone: request.phone,
            role: request.role,
            status: "active",
            hireDate: request.hireDate,
            createdAt: new Date().toISOString(),
        };

        const created = await this.repository.create(employee);
        metrics.addMetric('EmployeesCreated', MetricUnit.Count, 1);
        await this.eventPublisher.publish("EmployeeCreated", { organizationId, employeeId: created.employeeId });

        return created;
    }

    async getEmployee(organizationId: string, employeeId: string): Promise<Employee> {
        const employee = await this.repository.get(organizationId, employeeId);
        if (!employee) {
            throw new AppError("Employee not found", 404);
        }
        return employee;
    }

    async listEmployees(organizationId: string, options?: PaginationOptions): Promise<PaginatedResult<Employee>> {
        return this.repository.list(organizationId, options);
    }

    async updateEmployee(organizationId: string, employeeId: string, request: UpdateEmployeeRequest): Promise<Employee> {
        await this.getEmployee(organizationId, employeeId);
        const updated = await this.repository.update(organizationId, employeeId, request);
        return updated;
    }

    async deleteEmployee(organizationId: string, employeeId: string): Promise<void> {
        await this.repository.delete(organizationId, employeeId);
        logger.info("Employee deleted", { employeeId });
    }
}
