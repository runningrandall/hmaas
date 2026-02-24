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
    const propertyId = event.pathParameters?.propertyId;
    if (!propertyId) {
        throw new AppError("Missing propertyId", 400);
    }
    await service.deleteProperty(propertyId);
    return { statusCode: 200, body: JSON.stringify({ message: "Property deleted" }) };
};

export const handler = commonMiddleware(baseHandler);
