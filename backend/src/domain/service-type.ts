export type ServiceUnit = "per_visit" | "per_hour" | "per_sqft" | "per_linear_foot" | "per_unit" | "per_window";
export type ServiceFrequency = "weekly" | "biweekly" | "monthly" | "quarterly" | "biannual" | "annually" | "one_time";

export interface ServiceType {
    organizationId: string;
    serviceTypeId: string;
    name: string;
    description?: string;
    basePrice?: number;
    unit?: ServiceUnit;
    estimatedDuration?: number;
    frequency?: ServiceFrequency;
    measurementKey?: string;
    measurementUnit?: string;
    ratePerUnit?: number;
    durationPerUnit?: number;
    createdAt: string;
    updatedAt?: string;
}

export interface CreateServiceTypeRequest {
    name: string;
    description?: string;
    basePrice?: number;
    unit?: ServiceUnit;
    estimatedDuration?: number;
    frequency?: ServiceFrequency;
    measurementKey?: string;
    measurementUnit?: string;
    ratePerUnit?: number;
    durationPerUnit?: number;
}

export interface UpdateServiceTypeRequest {
    name?: string;
    description?: string;
    basePrice?: number;
    unit?: ServiceUnit;
    estimatedDuration?: number;
    frequency?: ServiceFrequency;
    measurementKey?: string;
    measurementUnit?: string;
    ratePerUnit?: number;
    durationPerUnit?: number;
}
