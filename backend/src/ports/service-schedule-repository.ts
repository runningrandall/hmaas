import { ServiceSchedule, UpdateServiceScheduleRequest } from "../domain/service-schedule";
import { PaginationOptions, PaginatedResult } from "../domain/shared";

export interface ServiceScheduleRepository {
    create(schedule: ServiceSchedule): Promise<ServiceSchedule>;
    get(organizationId: string, serviceScheduleId: string): Promise<ServiceSchedule | null>;
    listByServicerId(organizationId: string, servicerId: string, options?: PaginationOptions): Promise<PaginatedResult<ServiceSchedule>>;
    update(organizationId: string, serviceScheduleId: string, data: UpdateServiceScheduleRequest): Promise<ServiceSchedule>;
}
