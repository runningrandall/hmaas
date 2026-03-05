import {
    CognitoIdentityProviderClient,
    ListUsersInGroupCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { CognitoUser } from "../domain/organization";
import { CognitoUserProvider as ICognitoUserProvider } from "../ports/cognito-user-provider";
import { tracer, logger } from "../lib/observability";

const ADMIN_GROUPS = ["SuperAdmin", "Admin", "Manager"];

export class CognitoUserProviderAdapter implements ICognitoUserProvider {
    private client: CognitoIdentityProviderClient;
    private userPoolId: string;

    constructor(userPoolId: string) {
        this.client = tracer.captureAWSv3Client(new CognitoIdentityProviderClient({}));
        this.userPoolId = userPoolId;
    }

    async listAdminUsers(): Promise<CognitoUser[]> {
        const userMap = new Map<string, CognitoUser>();

        for (const group of ADMIN_GROUPS) {
            try {
                let nextToken: string | undefined;
                do {
                    const response = await this.client.send(
                        new ListUsersInGroupCommand({
                            UserPoolId: this.userPoolId,
                            GroupName: group,
                            NextToken: nextToken,
                        })
                    );

                    for (const user of response.Users || []) {
                        const sub = user.Attributes?.find((a) => a.Name === "sub")?.Value;
                        if (!sub) continue;

                        const existing = userMap.get(sub);
                        if (existing) {
                            existing.groups.push(group);
                        } else {
                            userMap.set(sub, {
                                userId: sub,
                                email: user.Attributes?.find((a) => a.Name === "email")?.Value,
                                name: user.Attributes?.find((a) => a.Name === "name")?.Value,
                                groups: [group],
                            });
                        }
                    }

                    nextToken = response.NextToken;
                } while (nextToken);
            } catch (error) {
                logger.error(`Failed to list users in group ${group}`, { error });
            }
        }

        return Array.from(userMap.values());
    }
}
