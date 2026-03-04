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
    const serviceTypeId = event.pathParameters?.serviceTypeId;
    const categoryId = event.pathParameters?.categoryId;
    if (!serviceTypeId) {
        throw new AppError("Missing serviceTypeId", 400);
    }
    if (!categoryId) {
        throw new AppError("Missing categoryId", 400);
    }
    await service.deleteEntityCategory(organizationId, "serviceType", serviceTypeId, categoryId);
    return { statusCode: 204, body: "" };
};

export const handler = commonMiddleware(baseHandler);
