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
    const paymentMethodId = event.pathParameters?.paymentMethodId;
    if (!paymentMethodId) {
        throw new AppError("Missing paymentMethodId", 400);
    }
    await service.deletePaymentMethod(paymentMethodId);
    return { statusCode: 200, body: JSON.stringify({ message: "Payment method deleted" }) };
};

export const handler = commonMiddleware(baseHandler);
