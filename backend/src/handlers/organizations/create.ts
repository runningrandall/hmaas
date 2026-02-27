import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { logger, metrics } from "../../lib/observability";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { CreateOrganizationSchema } from "../../lib/organization-schemas";
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
    const body = event.body as unknown as any;
    if (!body) {
        throw new AppError("Missing request body", 400);
    }
    const parseResult = CreateOrganizationSchema.safeParse(body);
    if (!parseResult.success) {
        logger.warn("Validation failed", { issues: parseResult.error.issues });
        metrics.addMetric('ValidationErrors', MetricUnit.Count, 1);
        throw parseResult.error;
    }
    const result = await service.createOrganization(parseResult.data);
    return { statusCode: 201, body: JSON.stringify(result) };
};

export const handler = superAdminMiddleware(baseHandler);
