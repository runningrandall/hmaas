import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { logger, metrics } from "../../lib/observability";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { CreatePropertyServiceSchema } from "../../lib/property-service-schemas";
import { commonMiddleware } from "../../lib/middleware";
import { AppError } from "../../lib/error";
import { DynamoPropertyServiceRepository } from "../../adapters/dynamo-property-service-repository";
import { EventBridgePublisher } from "../../adapters/event-bridge-publisher";
import { PropertyServiceService } from "../../application/property-service-service";

const repository = new DynamoPropertyServiceRepository();
const publisher = new EventBridgePublisher(process.env.EVENT_BUS_NAME || "");
const service = new PropertyServiceService(repository, publisher);

const baseHandler = async (event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> => {
    logger.addContext(context);
    const body = event.body as unknown as any;
    if (!body) {
        throw new AppError("Missing request body", 400);
    }

    const parseResult = CreatePropertyServiceSchema.safeParse(body);
    if (!parseResult.success) {
        logger.warn("Validation failed", { issues: parseResult.error.issues });
        metrics.addMetric('ValidationErrors', MetricUnit.Count, 1);
        throw parseResult.error;
    }

    const result = await service.createPropertyService(parseResult.data);
    return { statusCode: 201, body: JSON.stringify(result) };
};

export const handler = commonMiddleware(baseHandler);
