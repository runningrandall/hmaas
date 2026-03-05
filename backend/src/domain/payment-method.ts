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
