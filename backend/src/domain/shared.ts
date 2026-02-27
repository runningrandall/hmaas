export interface PaginationOptions {
    limit?: number;
    cursor?: string;
}

export interface PaginatedResult<T> {
    items: T[];
    cursor?: string | null;
}

export interface OrganizationContext {
    organizationId: string;
}

export interface EventPublisher {
    publish(eventName: string, payload: unknown): Promise<void>;
}
