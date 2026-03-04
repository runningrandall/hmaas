import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { logger } from "../../lib/observability";
import { commonMiddleware } from "../../lib/middleware";
import { AppError } from "../../lib/error";
import { DynamoEntityCategoryRepository } from "../../adapters/dynamo-entity-category-repository";
import { EventBridgePublisher } from "../../adapters/event-bridge-publisher";
import { EntityCategoryService } from "../../application/entity-category-service";

const repository = new DynamoEntityCategoryRepository();
const publisher = new EventBridgePublisher(process.env.EVENT_BUS_NAME || "");
const service = new EntityCategoryService(repository, publisher);

const baseHandler = async (event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> => {
    logger.addContext(context);
    const organizationId = (event as any).organizationId || event.pathParameters?.organizationId || '';
    const planId = event.pathParameters?.planId;
    if (!planId) {
        throw new AppError("Missing planId", 400);
    }
    const limit = event.queryStringParameters?.limit ? parseInt(event.queryStringParameters.limit, 10) : undefined;
    const cursor = event.queryStringParameters?.cursor || undefined;
    const result = await service.listByEntity(organizationId, "plan", planId, { limit, cursor });
    return { statusCode: 200, body: JSON.stringify(result) };
};

export const handler = commonMiddleware(baseHandler);
