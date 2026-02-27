import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { logger } from "../../lib/observability";
import { commonMiddleware } from "../../lib/middleware";
import { AppError } from "../../lib/error";
import { DynamoCostTypeRepository } from "../../adapters/dynamo-cost-type-repository";
import { EventBridgePublisher } from "../../adapters/event-bridge-publisher";
import { CostTypeService } from "../../application/cost-type-service";

const repository = new DynamoCostTypeRepository();
const publisher = new EventBridgePublisher(process.env.EVENT_BUS_NAME || "");
const service = new CostTypeService(repository, publisher);

const baseHandler = async (event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> => {
    logger.addContext(context);
    const organizationId = (event as any).organizationId || event.pathParameters?.organizationId || '';
    const costTypeId = event.pathParameters?.costTypeId;
    if (!costTypeId) {
        throw new AppError("Missing costTypeId", 400);
    }
    await service.deleteCostType(organizationId, costTypeId);
    return { statusCode: 200, body: JSON.stringify({ message: "Cost type deleted" }) };
};

export const handler = commonMiddleware(baseHandler);
