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
    const payId = event.pathParameters?.payId;
    if (!payId) {
        throw new AppError("Missing payId", 400);
    }
    await service.deletePay(organizationId, payId);
    return { statusCode: 200, body: JSON.stringify({ message: "Pay record deleted" }) };
};

export const handler = commonMiddleware(baseHandler);
