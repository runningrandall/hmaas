import { PaginationOptions, PaginatedResult } from "./shared";

export type PayFrequency = "weekly" | "biweekly" | "semimonthly" | "monthly";

export interface PaySchedule {
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
    get(payScheduleId: string): Promise<PaySchedule | null>;
    list(options?: PaginationOptions): Promise<PaginatedResult<PaySchedule>>;
    update(payScheduleId: string, data: UpdatePayScheduleRequest): Promise<PaySchedule>;
    delete(payScheduleId: string): Promise<void>;
}
