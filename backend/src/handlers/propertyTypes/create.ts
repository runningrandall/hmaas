import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { logger, metrics } from "../../lib/observability";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { CreatePropertyTypeSchema } from "../../lib/property-type-schemas";
import { commonMiddleware } from "../../lib/middleware";
import { AppError } from "../../lib/error";
import { DynamoPropertyTypeRepository } from "../../adapters/dynamo-property-type-repository";
import { EventBridgePublisher } from "../../adapters/event-bridge-publisher";
import { PropertyTypeService } from "../../application/property-type-service";

const repository = new DynamoPropertyTypeRepository();
const publisher = new EventBridgePublisher(process.env.EVENT_BUS_NAME || "");
const service = new PropertyTypeService(repository, publisher);

const baseHandler = async (event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> => {
    logger.addContext(context);
    const organizationId = (event as any).organizationId || event.pathParameters?.organizationId || '';
    const body = event.body as unknown as any;
    if (!body) {
        throw new AppError("Missing request body", 400);
    }

    const parseResult = CreatePropertyTypeSchema.safeParse(body);
    if (!parseResult.success) {
        logger.warn("Validation failed", { issues: parseResult.error.issues });
        metrics.addMetric('ValidationErrors', MetricUnit.Count, 1);
        throw parseResult.error;
    }

    const result = await service.createPropertyType(organizationId, parseResult.data);
    return { statusCode: 201, body: JSON.stringify(result) };
};

export const handler = commonMiddleware(baseHandler);
