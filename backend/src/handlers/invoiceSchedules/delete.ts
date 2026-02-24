import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { logger } from "../../lib/observability";
import { commonMiddleware } from "../../lib/middleware";
import { AppError } from "../../lib/error";
import { DynamoInvoiceScheduleRepository } from "../../adapters/dynamo-invoice-schedule-repository";
import { EventBridgePublisher } from "../../adapters/event-bridge-publisher";
import { InvoiceScheduleService } from "../../application/invoice-schedule-service";

const repository = new DynamoInvoiceScheduleRepository();
const publisher = new EventBridgePublisher(process.env.EVENT_BUS_NAME || "");
const service = new InvoiceScheduleService(repository, publisher);

const baseHandler = async (event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> => {
    logger.addContext(context);
    const invoiceScheduleId = event.pathParameters?.invoiceScheduleId;
    if (!invoiceScheduleId) {
        throw new AppError("Missing invoiceScheduleId", 400);
    }
    await service.deleteInvoiceSchedule(invoiceScheduleId);
    return { statusCode: 200, body: JSON.stringify({ message: "Invoice schedule deleted" }) };
};

export const handler = commonMiddleware(baseHandler);
