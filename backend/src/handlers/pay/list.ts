import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { logger } from "../../lib/observability";
import { commonMiddleware } from "../../lib/middleware";
import { AppError } from "../../lib/error";
import { DynamoPayRepository } from "../../adapters/dynamo-pay-repository";
import { PayService } from "../../application/pay-service";

const repository = new DynamoPayRepository();
const service = new PayService(repository);

const baseHandler = async (event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> => {
    logger.addContext(context);
    const organizationId = (event as any).organizationId || event.pathParameters?.organizationId || '';
    const employeeId = event.pathParameters?.employeeId;
    if (!employeeId) {
        throw new AppError("Missing employeeId", 400);
    }
    const limit = event.queryStringParameters?.limit ? parseInt(event.queryStringParameters.limit, 10) : undefined;
    const cursor = event.queryStringParameters?.cursor || undefined;
    const result = await service.listPayByEmployee(organizationId, employeeId, { limit, cursor });
    return { statusCode: 200, body: JSON.stringify(result) };
};

export const handler = commonMiddleware(baseHandler);
