import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { logger } from "../../lib/observability";
import { commonMiddleware } from "../../lib/middleware";
import { DynamoOrganizationRepository } from "../../adapters/dynamo-organization-repository";
import { SecretsManagerOrgSecrets } from "../../adapters/secrets-manager-org-secrets";
import { EventBridgePublisher } from "../../adapters/event-bridge-publisher";
import { OrganizationService } from "../../application/organization-service";

const orgRepo = new DynamoOrganizationRepository();
const secretsMgr = new SecretsManagerOrgSecrets();
const publisher = new EventBridgePublisher(process.env.EVENT_BUS_NAME || "");
const service = new OrganizationService(orgRepo, secretsMgr, publisher);

const STRIPE_KEYS = ["stripePublicKey", "stripeSecretKey"] as const;

const baseHandler = async (event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> => {
    logger.addContext(context);
    const organizationId = (event as any).organizationId;
    const secrets = await service.getSecrets(organizationId);
    const stripeKeys: Record<string, string | null> = {};
    for (const key of STRIPE_KEYS) {
        stripeKeys[key] = secrets[key] ?? null;
    }
    return { statusCode: 200, body: JSON.stringify(stripeKeys) };
};

export const handler = commonMiddleware(baseHandler);
