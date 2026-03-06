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

export interface ActorContext {
    userId: string;
}
