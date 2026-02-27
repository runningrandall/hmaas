import {
    SecretsManagerClient,
    GetSecretValueCommand,
    CreateSecretCommand,
    PutSecretValueCommand,
    ResourceNotFoundException,
} from "@aws-sdk/client-secrets-manager";
import { OrganizationSecretsManager } from "../domain/organization";
import { tracer, logger } from "../lib/observability";

export class SecretsManagerOrgSecrets implements OrganizationSecretsManager {
    private client: SecretsManagerClient;

    constructor() {
        this.client = tracer.captureAWSv3Client(new SecretsManagerClient({}));
    }

    private secretId(organizationId: string): string {
        return `versa/org/${organizationId}/secrets`;
    }

    async getSecrets(organizationId: string): Promise<Record<string, string>> {
        try {
            const result = await this.client.send(
                new GetSecretValueCommand({ SecretId: this.secretId(organizationId) })
            );
            if (!result.SecretString) return {};
            return JSON.parse(result.SecretString) as Record<string, string>;
        } catch (error) {
            if (error instanceof ResourceNotFoundException) {
                return {};
            }
            logger.error("Failed to get secrets", { organizationId, error });
            throw error;
        }
    }

    async getSecret(organizationId: string, key: string): Promise<string | null> {
        const secrets = await this.getSecrets(organizationId);
        return secrets[key] ?? null;
    }

    async setSecret(organizationId: string, key: string, value: string): Promise<void> {
        const secrets = await this.getSecrets(organizationId);
        secrets[key] = value;
        const secretString = JSON.stringify(secrets);

        try {
            await this.client.send(
                new PutSecretValueCommand({
                    SecretId: this.secretId(organizationId),
                    SecretString: secretString,
                })
            );
        } catch (error) {
            if (error instanceof ResourceNotFoundException) {
                await this.client.send(
                    new CreateSecretCommand({
                        Name: this.secretId(organizationId),
                        SecretString: secretString,
                    })
                );
            } else {
                logger.error("Failed to set secret", { organizationId, key, error });
                throw error;
            }
        }
    }

    async deleteSecret(organizationId: string, key: string): Promise<void> {
        const secrets = await this.getSecrets(organizationId);
        delete secrets[key];
        const secretString = JSON.stringify(secrets);

        try {
            await this.client.send(
                new PutSecretValueCommand({
                    SecretId: this.secretId(organizationId),
                    SecretString: secretString,
                })
            );
        } catch (error) {
            if (error instanceof ResourceNotFoundException) {
                return;
            }
            logger.error("Failed to delete secret", { organizationId, key, error });
            throw error;
        }
    }
}
