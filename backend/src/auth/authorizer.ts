import { APIGatewayTokenAuthorizerEvent, AuthResponse } from 'aws-lambda';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { VerifiedPermissionsClient, IsAuthorizedCommand } from '@aws-sdk/client-verifiedpermissions';

const userPoolId = process.env.USER_POOL_ID!;
const clientId = process.env.USER_POOL_CLIENT_ID!;
const policyStoreId = process.env.POLICY_STORE_ID!;

const verifier = CognitoJwtVerifier.create({
    userPoolId: userPoolId,
    tokenUse: "access",
    clientId: clientId,
});

const avp = new VerifiedPermissionsClient({ region: process.env.REGION || process.env.AWS_REGION });

function mapPathToAction(httpMethod: string, resourcePath: string): string {
    const isRead = httpMethod === 'GET';

    if (resourcePath.startsWith('property-types') || resourcePath.startsWith('service-types') || resourcePath.startsWith('cost-types')) {
        return isRead ? 'ReadDashboard' : 'ManageLookups';
    }
    if (resourcePath.startsWith('customers') || resourcePath.startsWith('accounts') || resourcePath.startsWith('delegates')) {
        return isRead ? 'ReadDashboard' : 'ManageCustomers';
    }
    if (resourcePath.startsWith('properties')) {
        return isRead ? 'ReadDashboard' : 'ManageProperties';
    }
    if (resourcePath.startsWith('plans') || resourcePath.startsWith('property-services') || resourcePath.startsWith('costs')) {
        return isRead ? 'ReadDashboard' : 'ManagePlans';
    }
    if (resourcePath.startsWith('employees') || resourcePath.startsWith('servicers') || resourcePath.startsWith('capabilities')) {
        return isRead ? 'ReadDashboard' : 'ManageEmployees';
    }
    if (resourcePath.startsWith('service-schedules')) {
        return isRead ? 'ViewSchedules' : 'ManageSchedules';
    }
    if (resourcePath.startsWith('invoices') || resourcePath.startsWith('payment-methods') || resourcePath.startsWith('invoice-schedules')) {
        return isRead ? 'ReadDashboard' : 'ManageInvoices';
    }
    if (resourcePath.startsWith('pay-schedules') || resourcePath.startsWith('pay')) {
        return isRead ? 'ReadDashboard' : 'ManageEmployees';
    }
    if (resourcePath.startsWith('organizations')) {
        if (resourcePath.includes('/config')) return isRead ? 'ManageOrgConfig' : 'ManageOrgConfig';
        if (resourcePath.includes('/secrets')) return isRead ? 'ManageOrgSecrets' : 'ManageOrgSecrets';
        return isRead ? 'ManageOrganizations' : 'ManageOrganizations';
    }

    return isRead ? 'ReadDashboard' : 'ManageUsers';
}

export const handler = async (event: APIGatewayTokenAuthorizerEvent): Promise<AuthResponse> => {
    console.log("Authorizer Event:", JSON.stringify(event));

    try {
        const token = event.authorizationToken.replace("Bearer ", "");
        const payload = await verifier.verify(token);
        const userId = payload.sub;
        const groups = (payload["cognito:groups"] || []) as string[];
        const organizationId = (payload as Record<string, unknown>)['custom:organizationId'] as string || '';

        const arnParts = event.methodArn.split('/');
        const httpMethod = arnParts[2];
        const resourcePath = arnParts.slice(3).join('/');

        const action = mapPathToAction(httpMethod, resourcePath);

        const command = new IsAuthorizedCommand({
            policyStoreId,
            principal: {
                entityType: "Versa::User",
                entityId: userId,
            },
            action: {
                actionType: "Versa::Action",
                actionId: action,
            },
            resource: {
                entityType: "Versa::Resource",
                entityId: "default",
            },
            entities: {
                entityList: [
                    {
                        identifier: { entityType: "Versa::User", entityId: userId },
                        attributes: {
                            groups: {
                                set: groups.map(g => ({ string: g }))
                            },
                            organizationId: {
                                string: organizationId
                            }
                        }
                    }
                ]
            }
        });

        const avpResponse = await avp.send(command);
        console.log("AVP Response:", avpResponse);

        const isAllowed = avpResponse.decision === 'ALLOW';

        return generatePolicy(userId, isAllowed ? 'Allow' : 'Deny', event.methodArn, { userId, groups: groups.join(','), organizationId });

    } catch (err) {
        console.error("Auth Failed:", err);
        throw new Error("Unauthorized");
    }
};

function generatePolicy(principalId: string, effect: string, resource: string, context: Record<string, string> = {}): AuthResponse {
    return {
        principalId,
        policyDocument: {
            Version: '2012-10-17',
            Statement: [{
                Action: 'execute-api:Invoke',
                Effect: effect as 'Allow' | 'Deny',
                Resource: resource,
            }],
        },
        context,
    };
}
