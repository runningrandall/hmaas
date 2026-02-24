import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { logger } from "../../lib/observability";
import { commonMiddleware } from "../../lib/middleware";
import { AppError } from "../../lib/error";
import { DynamoPaymentMethodRepository } from "../../adapters/dynamo-payment-method-repository";
import { EventBridgePublisher } from "../../adapters/event-bridge-publisher";
import { PaymentMethodService } from "../../application/payment-method-service";

const repository = new DynamoPaymentMethodRepository();
const publisher = new EventBridgePublisher(process.env.EVENT_BUS_NAME || "");
const service = new PaymentMethodService(repository, publisher);

const baseHandler = async (event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> => {
    logger.addContext(context);
    const customerId = event.pathParameters?.customerId;
    if (!customerId) {
        throw new AppError("Missing customerId", 400);
    }
    const limit = event.queryStringParameters?.limit ? parseInt(event.queryStringParameters.limit, 10) : undefined;
    const cursor = event.queryStringParameters?.cursor || undefined;
    const result = await service.listPaymentMethodsByCustomer(customerId, { limit, cursor });
    return { statusCode: 200, body: JSON.stringify(result) };
};

export const handler = commonMiddleware(baseHandler);
