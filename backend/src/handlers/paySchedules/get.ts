import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { logger } from "../../lib/observability";
import { commonMiddleware } from "../../lib/middleware";
import { AppError } from "../../lib/error";
import { DynamoPayScheduleRepository } from "../../adapters/dynamo-pay-schedule-repository";
import { PayScheduleService } from "../../application/pay-schedule-service";

const repository = new DynamoPayScheduleRepository();
const service = new PayScheduleService(repository);

const baseHandler = async (event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> => {
    logger.addContext(context);
    const payScheduleId = event.pathParameters?.payScheduleId;
    if (!payScheduleId) {
        throw new AppError("Missing payScheduleId", 400);
    }
    const result = await service.getPaySchedule(payScheduleId);
    return { statusCode: 200, body: JSON.stringify(result) };
};

export const handler = commonMiddleware(baseHandler);
