import { Organization, UpdateOrganizationRequest, OrganizationStatus, OrganizationConfig } from "../domain/organization";
import { PaginationOptions, PaginatedResult } from "../domain/shared";

export interface OrganizationRepository {
    create(organization: Organization): Promise<Organization>;
    get(organizationId: string): Promise<Organization | null>;
    getBySlug(slug: string): Promise<Organization | null>;
    list(options?: PaginationOptions): Promise<PaginatedResult<Organization>>;
    listByStatus(status: OrganizationStatus, options?: PaginationOptions): Promise<PaginatedResult<Organization>>;
    update(organizationId: string, data: UpdateOrganizationRequest): Promise<Organization>;
    updateConfig(organizationId: string, config: OrganizationConfig): Promise<Organization>;
    delete(organizationId: string): Promise<void>;
}
