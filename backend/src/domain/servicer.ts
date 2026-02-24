import { PaginationOptions, PaginatedResult } from "./shared";

export type ServicerStatus = "active" | "inactive";

export interface Servicer {
    servicerId: string;
    employeeId: string;
    serviceArea?: string;
    maxDailyJobs?: number;
    rating?: number;
    status: ServicerStatus;
    createdAt: string;
    updatedAt?: string;
}

export interface CreateServicerRequest {
    employeeId: string;
    serviceArea?: string;
    maxDailyJobs?: number;
}

export interface UpdateServicerRequest {
    serviceArea?: string;
    maxDailyJobs?: number;
    rating?: number;
    status?: ServicerStatus;
}

export interface ServicerRepository {
    create(servicer: Servicer): Promise<Servicer>;
    get(servicerId: string): Promise<Servicer | null>;
    getByEmployeeId(employeeId: string, options?: PaginationOptions): Promise<PaginatedResult<Servicer>>;
    update(servicerId: string, data: UpdateServicerRequest): Promise<Servicer>;
    delete(servicerId: string): Promise<void>;
}
