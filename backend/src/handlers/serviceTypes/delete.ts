import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { logger } from "../../lib/observability";
import { commonMiddleware } from "../../lib/middleware";
import { AppError } from "../../lib/error";
import { DynamoServiceTypeRepository } from "../../adapters/dynamo-service-type-repository";
import { EventBridgePublisher } from "../../adapters/event-bridge-publisher";
import { ServiceTypeService } from "../../application/service-type-service";

const repository = new DynamoServiceTypeRepository();
const publisher = new EventBridgePublisher(process.env.EVENT_BUS_NAME || "");
const service = new ServiceTypeService(repository, publisher);

const baseHandler = async (event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> => {
    logger.addContext(context);
    const organizationId = (event as any).organizationId || event.pathParameters?.organizationId || '';
    const serviceTypeId = event.pathParameters?.serviceTypeId;
    if (!serviceTypeId) {
        throw new AppError("Missing serviceTypeId", 400);
    }
    await service.deleteServiceType(organizationId, serviceTypeId);
    return { statusCode: 204, body: "" };
};

export const handler = commonMiddleware(baseHandler);
