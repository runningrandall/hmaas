import { PaginationOptions, PaginatedResult } from "./shared";

export type PaymentMethodType = "credit_card" | "debit_card" | "bank_account" | "ach";
export type PaymentMethodStatus = "active" | "inactive";

export interface PaymentMethod {
    organizationId: string;
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
    get(organizationId: string, paymentMethodId: string): Promise<PaymentMethod | null>;
    listByCustomerId(organizationId: string, customerId: string, options?: PaginationOptions): Promise<PaginatedResult<PaymentMethod>>;
    delete(organizationId: string, paymentMethodId: string): Promise<void>;
}
