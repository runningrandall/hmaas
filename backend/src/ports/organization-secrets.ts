export interface OrganizationSecretsManager {
    getSecrets(organizationId: string): Promise<Record<string, string>>;
    getSecret(organizationId: string, key: string): Promise<string | null>;
    setSecret(organizationId: string, key: string, value: string): Promise<void>;
    deleteSecret(organizationId: string, key: string): Promise<void>;
}
