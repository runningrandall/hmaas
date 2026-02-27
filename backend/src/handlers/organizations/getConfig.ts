import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { logger } from "../../lib/observability";
import { superAdminMiddleware } from "../../lib/middleware";
import { AppError } from "../../lib/error";
import { DynamoOrganizationRepository } from "../../adapters/dynamo-organization-repository";
import { SecretsManagerOrgSecrets } from "../../adapters/secrets-manager-org-secrets";
import { EventBridgePublisher } from "../../adapters/event-bridge-publisher";
import { OrganizationService } from "../../application/organization-service";

const orgRepo = new DynamoOrganizationRepository();
const secretsMgr = new SecretsManagerOrgSecrets();
const publisher = new EventBridgePublisher(process.env.EVENT_BUS_NAME || "");
const service = new OrganizationService(orgRepo, secretsMgr, publisher);

const baseHandler = async (event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> => {
    logger.addContext(context);
    const organizationId = event.pathParameters?.organizationId;
    if (!organizationId) {
        throw new AppError("Missing organizationId", 400);
    }
    const result = await service.getConfig(organizationId);
    return { statusCode: 200, body: JSON.stringify(result) };
};

export const handler = superAdminMiddleware(baseHandler);
