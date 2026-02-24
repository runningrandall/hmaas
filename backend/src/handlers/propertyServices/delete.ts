import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { logger } from "../../lib/observability";
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
    const serviceId = event.pathParameters?.serviceId;
    if (!serviceId) {
        throw new AppError("Missing serviceId", 400);
    }
    await service.deletePropertyService(serviceId);
    return { statusCode: 204, body: "" };
};

export const handler = commonMiddleware(baseHandler);
