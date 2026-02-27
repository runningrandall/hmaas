import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { logger } from "../../lib/observability";
import { commonMiddleware } from "../../lib/middleware";
import { AppError } from "../../lib/error";
import { DynamoServiceScheduleRepository } from "../../adapters/dynamo-service-schedule-repository";
import { EventBridgePublisher } from "../../adapters/event-bridge-publisher";
import { ServiceScheduleService } from "../../application/service-schedule-service";

const repository = new DynamoServiceScheduleRepository();
const publisher = new EventBridgePublisher(process.env.EVENT_BUS_NAME || "");
const service = new ServiceScheduleService(repository, publisher);

const baseHandler = async (event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> => {
    logger.addContext(context);
    const organizationId = (event as any).organizationId || event.pathParameters?.organizationId || '';
    const serviceScheduleId = event.pathParameters?.serviceScheduleId;
    if (!serviceScheduleId) {
        throw new AppError("Missing serviceScheduleId", 400);
    }
    const result = await service.getServiceSchedule(organizationId, serviceScheduleId);
    return { statusCode: 200, body: JSON.stringify(result) };
};

export const handler = commonMiddleware(baseHandler);
