import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { logger } from "../../lib/observability";
import { commonMiddleware } from "../../lib/middleware";
import { AppError } from "../../lib/error";
import { DynamoInvoiceRepository } from "../../adapters/dynamo-invoice-repository";
import { EventBridgePublisher } from "../../adapters/event-bridge-publisher";
import { InvoiceService } from "../../application/invoice-service";

const repository = new DynamoInvoiceRepository();
const publisher = new EventBridgePublisher(process.env.EVENT_BUS_NAME || "");
const service = new InvoiceService(repository, publisher);

const baseHandler = async (event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> => {
    logger.addContext(context);
    const invoiceId = event.pathParameters?.invoiceId;
    if (!invoiceId) {
        throw new AppError("Missing invoiceId", 400);
    }
    const result = await service.getInvoice(invoiceId);
    return { statusCode: 200, body: JSON.stringify(result) };
};

export const handler = commonMiddleware(baseHandler);
