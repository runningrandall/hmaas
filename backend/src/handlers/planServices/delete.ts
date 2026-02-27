import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { logger } from "../../lib/observability";
import { commonMiddleware } from "../../lib/middleware";
import { AppError } from "../../lib/error";
import { DynamoPlanServiceRepository } from "../../adapters/dynamo-plan-service-repository";
import { EventBridgePublisher } from "../../adapters/event-bridge-publisher";
import { PlanServiceMgmtService } from "../../application/plan-service-mgmt-service";

const repository = new DynamoPlanServiceRepository();
const publisher = new EventBridgePublisher(process.env.EVENT_BUS_NAME || "");
const service = new PlanServiceMgmtService(repository, publisher);

const baseHandler = async (event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> => {
    logger.addContext(context);
    const organizationId = (event as any).organizationId || event.pathParameters?.organizationId || '';
    const planId = event.pathParameters?.planId;
    const serviceTypeId = event.pathParameters?.serviceTypeId;
    if (!planId) {
        throw new AppError("Missing planId", 400);
    }
    if (!serviceTypeId) {
        throw new AppError("Missing serviceTypeId", 400);
    }
    await service.deletePlanService(organizationId, planId, serviceTypeId);
    return { statusCode: 204, body: "" };
};

export const handler = commonMiddleware(baseHandler);
