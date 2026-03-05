import { PaySchedule, UpdatePayScheduleRequest } from "../domain/pay-schedule";
import { PaginationOptions, PaginatedResult } from "../domain/shared";

export interface PayScheduleRepository {
    create(paySchedule: PaySchedule): Promise<PaySchedule>;
    get(organizationId: string, payScheduleId: string): Promise<PaySchedule | null>;
    list(organizationId: string, options?: PaginationOptions): Promise<PaginatedResult<PaySchedule>>;
    update(organizationId: string, payScheduleId: string, data: UpdatePayScheduleRequest): Promise<PaySchedule>;
    delete(organizationId: string, payScheduleId: string): Promise<void>;
}
