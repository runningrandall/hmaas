import { PaymentMethod } from "../domain/payment-method";
import { PaginationOptions, PaginatedResult } from "../domain/shared";

export interface PaymentMethodRepository {
    create(paymentMethod: PaymentMethod): Promise<PaymentMethod>;
    get(organizationId: string, paymentMethodId: string): Promise<PaymentMethod | null>;
    listByCustomerId(organizationId: string, customerId: string, options?: PaginationOptions): Promise<PaginatedResult<PaymentMethod>>;
    delete(organizationId: string, paymentMethodId: string): Promise<void>;
}
