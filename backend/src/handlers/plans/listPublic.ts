import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { logger } from "../../lib/observability";
import { publicMiddleware } from "../../lib/middleware";
import { AppError } from "../../lib/error";
import { DynamoPlanRepository } from "../../adapters/dynamo-plan-repository";
import { EventBridgePublisher } from "../../adapters/event-bridge-publisher";
import { PlanAppService } from "../../application/plan-service";

const repository = new DynamoPlanRepository();
const publisher = new EventBridgePublisher(process.env.EVENT_BUS_NAME || "");
const service = new PlanAppService(repository, publisher);

const baseHandler = async (event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> => {
    logger.addContext(context);
    const organizationId = event.queryStringParameters?.organizationId;
    if (!organizationId) {
        throw new AppError("Missing required query parameter: organizationId", 400);
    }
    const limit = event.queryStringParameters?.limit ? parseInt(event.queryStringParameters.limit, 10) : undefined;
    const cursor = event.queryStringParameters?.cursor || undefined;
    const result = await service.listPlans(organizationId, { limit, cursor });
    return { statusCode: 200, body: JSON.stringify(result) };
};

export const handler = publicMiddleware(baseHandler);
