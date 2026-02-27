import { PaginationOptions, PaginatedResult } from "./shared";

export type PayFrequency = "weekly" | "biweekly" | "semimonthly" | "monthly";

export interface PaySchedule {
    organizationId: string;
    payScheduleId: string;
    name: string;
    frequency: PayFrequency;
    dayOfWeek?: number;
    dayOfMonth?: number;
    createdAt: string;
    updatedAt?: string;
}

export interface CreatePayScheduleRequest {
    name: string;
    frequency: PayFrequency;
    dayOfWeek?: number;
    dayOfMonth?: number;
}

export interface UpdatePayScheduleRequest {
    name?: string;
    frequency?: PayFrequency;
    dayOfWeek?: number;
    dayOfMonth?: number;
}

export interface PayScheduleRepository {
    create(paySchedule: PaySchedule): Promise<PaySchedule>;
    get(organizationId: string, payScheduleId: string): Promise<PaySchedule | null>;
    list(organizationId: string, options?: PaginationOptions): Promise<PaginatedResult<PaySchedule>>;
    update(organizationId: string, payScheduleId: string, data: UpdatePayScheduleRequest): Promise<PaySchedule>;
    delete(organizationId: string, payScheduleId: string): Promise<void>;
}
