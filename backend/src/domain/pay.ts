export type PayType = "hourly" | "salary" | "commission" | "bonus";

export interface Pay {
    organizationId: string;
    payId: string;
    employeeId: string;
    payScheduleId?: string;
    payType: PayType;
    rate: number;
    effectiveDate: string;
    createdAt: string;
    updatedAt?: string;
}

export interface CreatePayRequest {
    employeeId: string;
    payScheduleId?: string;
    payType: PayType;
    rate: number;
    effectiveDate: string;
}

export interface UpdatePayRequest {
    payScheduleId?: string;
    payType?: PayType;
    rate?: number;
    effectiveDate?: string;
}
