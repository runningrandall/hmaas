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
