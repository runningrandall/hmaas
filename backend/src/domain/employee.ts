export type EmployeeStatus = "active" | "inactive" | "terminated";

export interface Employee {
    organizationId: string;
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
