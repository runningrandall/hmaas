export type ServicerStatus = "active" | "inactive";

export interface Servicer {
    organizationId: string;
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
