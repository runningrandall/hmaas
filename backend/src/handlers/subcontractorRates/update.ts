import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { logger, metrics } from "../../lib/observability";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { UpdateSubcontractorRateSchema } from "../../lib/subcontractor-rate-schemas";
import { commonMiddleware, getOrgId } from "../../lib/middleware";
import { AppError } from "../../lib/error";
import { DynamoSubcontractorRateRepository } from "../../adapters/dynamo-subcontractor-rate-repository";
import { EventBridgePublisher } from "../../adapters/event-bridge-publisher";
import { SubcontractorRateService } from "../../application/subcontractor-rate-service";

const repository = new DynamoSubcontractorRateRepository();
const publisher = new EventBridgePublisher(process.env.EVENT_BUS_NAME || "");
const service = new SubcontractorRateService(repository, publisher);

const baseHandler = async (event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> => {
    logger.addContext(context);
    const organizationId = getOrgId(event);
    const subcontractorRateId = event.pathParameters?.subcontractorRateId;
    if (!subcontractorRateId) {
        throw new AppError("Missing subcontractorRateId", 400);
    }
    const body = event.body as unknown as any;
    if (!body) {
        throw new AppError("Missing request body", 400);
    }
    const parseResult = UpdateSubcontractorRateSchema.safeParse(body);
    if (!parseResult.success) {
        logger.warn("Validation failed", { issues: parseResult.error.issues });
        metrics.addMetric('ValidationErrors', MetricUnit.Count, 1);
        throw parseResult.error;
    }
    const result = await service.updateRate(organizationId, subcontractorRateId, parseResult.data);
    return { statusCode: 200, body: JSON.stringify(result) };
};

export const handler = commonMiddleware(baseHandler);
