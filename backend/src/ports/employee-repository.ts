import { Employee, UpdateEmployeeRequest } from "../domain/employee";
import { PaginationOptions, PaginatedResult } from "../domain/shared";

export interface EmployeeRepository {
    create(employee: Employee): Promise<Employee>;
    get(organizationId: string, employeeId: string): Promise<Employee | null>;
    list(organizationId: string, options?: PaginationOptions): Promise<PaginatedResult<Employee>>;
    update(organizationId: string, employeeId: string, data: UpdateEmployeeRequest): Promise<Employee>;
    delete(organizationId: string, employeeId: string): Promise<void>;
}
