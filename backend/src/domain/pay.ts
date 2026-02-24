import { PaginationOptions, PaginatedResult } from "./shared";

export type PayType = "hourly" | "salary" | "commission" | "bonus";

export interface Pay {
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

export interface PayRepository {
    create(pay: Pay): Promise<Pay>;
    get(payId: string): Promise<Pay | null>;
    listByEmployeeId(employeeId: string, options?: PaginationOptions): Promise<PaginatedResult<Pay>>;
    update(payId: string, data: UpdatePayRequest): Promise<Pay>;
    delete(payId: string): Promise<void>;
}
