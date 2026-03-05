export type ServiceScheduleStatus = "scheduled" | "in_progress" | "completed" | "cancelled";

export interface ServiceSchedule {
    organizationId: string;
    serviceScheduleId: string;
    serviceId: string;
    servicerId: string;
    scheduledDate: string;
    scheduledTime?: string;
    estimatedDuration?: number;
    status: ServiceScheduleStatus;
    completedAt?: string;
    createdAt: string;
    updatedAt?: string;
}

export interface CreateServiceScheduleRequest {
    serviceId: string;
    servicerId: string;
    scheduledDate: string;
    scheduledTime?: string;
    estimatedDuration?: number;
}

export interface UpdateServiceScheduleRequest {
    scheduledDate?: string;
    scheduledTime?: string;
    estimatedDuration?: number;
    status?: ServiceScheduleStatus;
    completedAt?: string;
}
