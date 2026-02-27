import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { logger, metrics } from "../../lib/observability";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { CreateServiceScheduleSchema } from "../../lib/service-schedule-schemas";
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
    const body = event.body as unknown as any;
    if (!body) {
        throw new AppError("Missing request body", 400);
    }
    const parseResult = CreateServiceScheduleSchema.safeParse(body);
    if (!parseResult.success) {
        logger.warn("Validation failed", { issues: parseResult.error.issues });
        metrics.addMetric('ValidationErrors', MetricUnit.Count, 1);
        throw parseResult.error;
    }
    const result = await service.createServiceSchedule(organizationId, parseResult.data);
    return { statusCode: 201, body: JSON.stringify(result) };
};

export const handler = commonMiddleware(baseHandler);
