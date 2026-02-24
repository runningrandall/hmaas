import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { logger } from "../../lib/observability";
import { commonMiddleware } from "../../lib/middleware";
import { AppError } from "../../lib/error";
import { DynamoPlanRepository } from "../../adapters/dynamo-plan-repository";
import { EventBridgePublisher } from "../../adapters/event-bridge-publisher";
import { PlanAppService } from "../../application/plan-service";

const repository = new DynamoPlanRepository();
const publisher = new EventBridgePublisher(process.env.EVENT_BUS_NAME || "");
const service = new PlanAppService(repository, publisher);

const baseHandler = async (event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> => {
    logger.addContext(context);
    const planId = event.pathParameters?.planId;
    if (!planId) {
        throw new AppError("Missing planId", 400);
    }
    const result = await service.getPlan(planId);
    return { statusCode: 200, body: JSON.stringify(result) };
};

export const handler = commonMiddleware(baseHandler);
