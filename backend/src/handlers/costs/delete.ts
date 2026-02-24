import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { logger } from "../../lib/observability";
import { commonMiddleware } from "../../lib/middleware";
import { AppError } from "../../lib/error";
import { DynamoCostRepository } from "../../adapters/dynamo-cost-repository";
import { EventBridgePublisher } from "../../adapters/event-bridge-publisher";
import { CostService } from "../../application/cost-service";

const repository = new DynamoCostRepository();
const publisher = new EventBridgePublisher(process.env.EVENT_BUS_NAME || "");
const service = new CostService(repository, publisher);

const baseHandler = async (event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> => {
    logger.addContext(context);
    const costId = event.pathParameters?.costId;
    if (!costId) {
        throw new AppError("Missing costId", 400);
    }
    await service.deleteCost(costId);
    return { statusCode: 204, body: "" };
};

export const handler = commonMiddleware(baseHandler);
