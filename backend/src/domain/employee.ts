import { PaginationOptions, PaginatedResult } from "./shared";

export type EmployeeStatus = "active" | "inactive" | "terminated";

export interface Employee {
    employeeId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    role: string;
    status: EmployeeStatus;
    hireDate?: string;
    createdAt: string;
    updatedAt?: string;
}

export interface CreateEmployeeRequest {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    role: string;
    hireDate?: string;
}

export interface UpdateEmployeeRequest {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    role?: string;
    status?: EmployeeStatus;
    hireDate?: string;
}

export interface EmployeeRepository {
    create(employee: Employee): Promise<Employee>;
    get(employeeId: string): Promise<Employee | null>;
    list(options?: PaginationOptions): Promise<PaginatedResult<Employee>>;
    update(employeeId: string, data: UpdateEmployeeRequest): Promise<Employee>;
    delete(employeeId: string): Promise<void>;
}
