import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { logger, metrics } from "../../lib/observability";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { CreateEntityCategorySchema } from "../../lib/entity-category-schemas";
import { commonMiddleware, getOrgId } from "../../lib/middleware";
import { AppError } from "../../lib/error";
import { DynamoEntityCategoryRepository } from "../../adapters/dynamo-entity-category-repository";
import { EventBridgePublisher } from "../../adapters/event-bridge-publisher";
import { EntityCategoryService } from "../../application/entity-category-service";

const repository = new DynamoEntityCategoryRepository();
const publisher = new EventBridgePublisher(process.env.EVENT_BUS_NAME || "");
const service = new EntityCategoryService(repository, publisher);

const baseHandler = async (event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> => {
    logger.addContext(context);
    const organizationId = getOrgId(event);
    const planId = event.pathParameters?.planId;
    if (!planId) {
        throw new AppError("Missing planId", 400);
    }
    const body = event.body as unknown as any;
    if (!body) {
        throw new AppError("Missing request body", 400);
    }
    const parseResult = CreateEntityCategorySchema.safeParse(body);
    if (!parseResult.success) {
        logger.warn("Validation failed", { issues: parseResult.error.issues });
        metrics.addMetric('ValidationErrors', MetricUnit.Count, 1);
        throw parseResult.error;
    }
    const result = await service.createEntityCategory(organizationId, {
        entityType: "plan",
        entityId: planId,
        categoryId: parseResult.data.categoryId,
    });
    return { statusCode: 201, body: JSON.stringify(result) };
};

export const handler = commonMiddleware(baseHandler);
