import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { logger, metrics } from "../../lib/observability";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { CreateInvoiceScheduleSchema } from "../../lib/invoice-schedule-schemas";
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
    const organizationId = (event as any).organizationId || event.pathParameters?.organizationId || '';
    const customerId = event.pathParameters?.customerId;
    if (!customerId) {
        throw new AppError("Missing customerId", 400);
    }
    const body = event.body as unknown as any;
    if (!body) {
        throw new AppError("Missing request body", 400);
    }
    const parseResult = CreateInvoiceScheduleSchema.safeParse(body);
    if (!parseResult.success) {
        logger.warn("Validation failed", { issues: parseResult.error.issues });
        metrics.addMetric('ValidationErrors', MetricUnit.Count, 1);
        throw parseResult.error;
    }
    const result = await service.createInvoiceSchedule(organizationId, { ...parseResult.data, customerId });
    return { statusCode: 201, body: JSON.stringify(result) };
};

export const handler = commonMiddleware(baseHandler);
