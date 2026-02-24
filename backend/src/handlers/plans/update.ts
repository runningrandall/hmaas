import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { logger, metrics } from "../../lib/observability";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { UpdatePlanSchema } from "../../lib/plan-schemas";
import { commonMiddleware } from "../../lib/middleware";
import { AppError } from "../../lib/error";
import { DynamoPlanRepository } from "../../adapters/dynamo-plan-repository";
import { EventBridgePublisher } from "../../adapters/event-bridge-publisher";
import { PlanAppService } from "../../application/plan-service";

const repository = new DynamoPlanRepository();
const publisher = new EventBridgePublisher(process.env.EVENT_BUS_NAME || "");
const service = new PlanAppService(repository, publisher);

const baseHandler = async (event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> => {
    logger.addContext(context);
    const planId = event.pathParameters?.planId;
    if (!planId) {
        throw new AppError("Missing planId", 400);
    }

    const body = event.body as unknown as any;
    if (!body) {
        throw new AppError("Missing request body", 400);
    }

    const parseResult = UpdatePlanSchema.safeParse(body);
    if (!parseResult.success) {
        logger.warn("Validation failed", { issues: parseResult.error.issues });
        metrics.addMetric('ValidationErrors', MetricUnit.Count, 1);
        throw parseResult.error;
    }

    const result = await service.updatePlan(planId, parseResult.data);
    return { statusCode: 200, body: JSON.stringify(result) };
};

export const handler = commonMiddleware(baseHandler);
