import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { logger, metrics } from "../../lib/observability";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { UpdateServiceTypeSchema } from "../../lib/service-type-schemas";
import { commonMiddleware } from "../../lib/middleware";
import { AppError } from "../../lib/error";
import { DynamoServiceTypeRepository } from "../../adapters/dynamo-service-type-repository";
import { EventBridgePublisher } from "../../adapters/event-bridge-publisher";
import { ServiceTypeService } from "../../application/service-type-service";

const repository = new DynamoServiceTypeRepository();
const publisher = new EventBridgePublisher(process.env.EVENT_BUS_NAME || "");
const service = new ServiceTypeService(repository, publisher);

const baseHandler = async (event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> => {
    logger.addContext(context);
    const organizationId = (event as any).organizationId || event.pathParameters?.organizationId || '';
    const serviceTypeId = event.pathParameters?.serviceTypeId;
    if (!serviceTypeId) {
        throw new AppError("Missing serviceTypeId", 400);
    }

    const body = event.body as unknown as any;
    if (!body) {
        throw new AppError("Missing request body", 400);
    }

    const parseResult = UpdateServiceTypeSchema.safeParse(body);
    if (!parseResult.success) {
        logger.warn("Validation failed", { issues: parseResult.error.issues });
        metrics.addMetric('ValidationErrors', MetricUnit.Count, 1);
        throw parseResult.error;
    }

    const result = await service.updateServiceType(organizationId, serviceTypeId, parseResult.data);
    return { statusCode: 200, body: JSON.stringify(result) };
};

export const handler = commonMiddleware(baseHandler);
