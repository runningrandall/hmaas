import { Delegate } from "../domain/delegate";
import { PaginationOptions, PaginatedResult } from "../domain/shared";

export interface DelegateRepository {
    create(delegate: Delegate): Promise<Delegate>;
    get(organizationId: string, delegateId: string): Promise<Delegate | null>;
    listByAccountId(organizationId: string, accountId: string, options?: PaginationOptions): Promise<PaginatedResult<Delegate>>;
    delete(organizationId: string, delegateId: string): Promise<void>;
}
