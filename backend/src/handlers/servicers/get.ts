import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { logger } from "../../lib/observability";
import { commonMiddleware } from "../../lib/middleware";
import { AppError } from "../../lib/error";
import { DynamoServicerRepository } from "../../adapters/dynamo-servicer-repository";
import { EventBridgePublisher } from "../../adapters/event-bridge-publisher";
import { ServicerService } from "../../application/servicer-service";

const repository = new DynamoServicerRepository();
const publisher = new EventBridgePublisher(process.env.EVENT_BUS_NAME || "");
const service = new ServicerService(repository, publisher);

const baseHandler = async (event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> => {
    logger.addContext(context);
    const servicerId = event.pathParameters?.servicerId;
    if (!servicerId) {
        throw new AppError("Missing servicerId", 400);
    }
    const result = await service.getServicer(servicerId);
    return { statusCode: 200, body: JSON.stringify(result) };
};

export const handler = commonMiddleware(baseHandler);
