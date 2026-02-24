import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { logger } from "../../lib/observability";
import { commonMiddleware } from "../../lib/middleware";
import { AppError } from "../../lib/error";
import { DynamoCustomerRepository } from "../../adapters/dynamo-customer-repository";
import { DynamoAccountRepository } from "../../adapters/dynamo-account-repository";
import { EventBridgePublisher } from "../../adapters/event-bridge-publisher";
import { CustomerService } from "../../application/customer-service";

const customerRepo = new DynamoCustomerRepository();
const accountRepo = new DynamoAccountRepository();
const publisher = new EventBridgePublisher(process.env.EVENT_BUS_NAME || "");
const service = new CustomerService(customerRepo, accountRepo, publisher);

const baseHandler = async (event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> => {
    logger.addContext(context);
    const customerId = event.pathParameters?.customerId;
    if (!customerId) {
        throw new AppError("Missing customerId", 400);
    }
    const result = await service.getCustomer(customerId);
    return { statusCode: 200, body: JSON.stringify(result) };
};

export const handler = commonMiddleware(baseHandler);
