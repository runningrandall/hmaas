import { PaginationOptions, PaginatedResult } from "./shared";

export type PaymentMethodType = "credit_card" | "debit_card" | "bank_account" | "ach";
export type PaymentMethodStatus = "active" | "inactive";

export interface PaymentMethod {
    paymentMethodId: string;
    customerId: string;
    type: PaymentMethodType;
    last4: string;
    isDefault?: boolean;
    status: PaymentMethodStatus;
    createdAt: string;
    updatedAt?: string;
}

export interface CreatePaymentMethodRequest {
    customerId: string;
    type: PaymentMethodType;
    last4: string;
    isDefault?: boolean;
}

export interface PaymentMethodRepository {
    create(paymentMethod: PaymentMethod): Promise<PaymentMethod>;
    get(paymentMethodId: string): Promise<PaymentMethod | null>;
    listByCustomerId(customerId: string, options?: PaginationOptions): Promise<PaginatedResult<PaymentMethod>>;
    delete(paymentMethodId: string): Promise<void>;
}
