export type EstimateStatus = "draft" | "sent" | "accepted" | "rejected" | "expired" | "invoiced";

export interface EstimateLineItem {
    serviceTypeId: string;
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    total: number;
    estimatedDuration?: number;
}

export interface Estimate {
    organizationId: string;
    estimateId: string;
    customerId: string;
    propertyId: string;
    estimateNumber: string;
    estimateDate: string;
    expirationDate?: string;
    status: EstimateStatus;
    subtotal: number;
    tax: number;
    total: number;
    lineItems: EstimateLineItem[];
    notes?: string;
    acceptedAt?: string;
    invoiceId?: string;
    createdAt: string;
    updatedAt?: string;
}

export interface GenerateEstimateRequest {
    customerId: string;
    propertyId: string;
    serviceTypeIds?: string[];
    planId?: string;
    notes?: string;
    expirationDate?: string;
}

export interface UpdateEstimateRequest {
    status?: EstimateStatus;
    lineItems?: EstimateLineItem[];
    notes?: string;
    expirationDate?: string;
}
