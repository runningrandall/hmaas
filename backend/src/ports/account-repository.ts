import { Account, UpdateAccountRequest } from "../domain/account";

export interface AccountRepository {
    create(account: Account): Promise<Account>;
    get(organizationId: string, accountId: string): Promise<Account | null>;
    getByCustomerId(organizationId: string, customerId: string): Promise<Account | null>;
    update(organizationId: string, accountId: string, data: UpdateAccountRequest): Promise<Account>;
    delete(organizationId: string, accountId: string): Promise<void>;
}
