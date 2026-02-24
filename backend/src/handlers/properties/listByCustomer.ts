import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { logger } from "../../lib/observability";
import { commonMiddleware } from "../../lib/middleware";
import { AppError } from "../../lib/error";
import { DynamoPropertyRepository } from "../../adapters/dynamo-property-repository";
import { EventBridgePublisher } from "../../adapters/event-bridge-publisher";
import { PropertyService } from "../../application/property-service";

const repository = new DynamoPropertyRepository();
const publisher = new EventBridgePublisher(process.env.EVENT_BUS_NAME || "");
const service = new PropertyService(repository, publisher);

const baseHandler = async (event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> => {
    logger.addContext(context);
    const customerId = event.pathParameters?.customerId;
    if (!customerId) {
        throw new AppError("Missing customerId", 400);
    }
    const limit = event.queryStringParameters?.limit ? parseInt(event.queryStringParameters.limit, 10) : undefined;
    const cursor = event.queryStringParameters?.cursor || undefined;
    const result = await service.listPropertiesByCustomer(customerId, { limit, cursor });
    return { statusCode: 200, body: JSON.stringify(result) };
};

export const handler = commonMiddleware(baseHandler);
