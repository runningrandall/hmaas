import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { logger, metrics } from "../../lib/observability";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { SetStripeKeysSchema } from "../../lib/integration-schemas";
import { commonMiddleware } from "../../lib/middleware";
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
    const organizationId = (event as any).organizationId;
    const body = event.body as unknown as any;
    if (!body) {
        throw new AppError("Missing request body", 400);
    }
    const parseResult = SetStripeKeysSchema.safeParse(body);
    if (!parseResult.success) {
        logger.warn("Validation failed", { issues: parseResult.error.issues });
        metrics.addMetric("ValidationErrors", MetricUnit.Count, 1);
        throw parseResult.error;
    }
    const { stripePublicKey, stripeSecretKey } = parseResult.data;
    await service.setSecret(organizationId, "stripePublicKey", stripePublicKey);
    await service.setSecret(organizationId, "stripeSecretKey", stripeSecretKey);
    logger.info("Stripe keys updated", { organizationId });
    metrics.addMetric("StripeKeysUpdated", MetricUnit.Count, 1);
    return { statusCode: 200, body: JSON.stringify({ message: "Stripe keys updated successfully" }) };
};

export const handler = commonMiddleware(baseHandler);
