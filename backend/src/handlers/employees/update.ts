import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { logger, metrics } from "../../lib/observability";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { UpdateEmployeeSchema } from "../../lib/employee-schemas";
import { commonMiddleware } from "../../lib/middleware";
import { AppError } from "../../lib/error";
import { DynamoEmployeeRepository } from "../../adapters/dynamo-employee-repository";
import { EventBridgePublisher } from "../../adapters/event-bridge-publisher";
import { EmployeeService } from "../../application/employee-service";

const repository = new DynamoEmployeeRepository();
const publisher = new EventBridgePublisher(process.env.EVENT_BUS_NAME || "");
const service = new EmployeeService(repository, publisher);

const baseHandler = async (event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> => {
    logger.addContext(context);
    const organizationId = (event as any).organizationId || event.pathParameters?.organizationId || '';
    const employeeId = event.pathParameters?.employeeId;
    if (!employeeId) {
        throw new AppError("Missing employeeId", 400);
    }
    const body = event.body as unknown as any;
    if (!body) {
        throw new AppError("Missing request body", 400);
    }
    const parseResult = UpdateEmployeeSchema.safeParse(body);
    if (!parseResult.success) {
        logger.warn("Validation failed", { issues: parseResult.error.issues });
        metrics.addMetric('ValidationErrors', MetricUnit.Count, 1);
        throw parseResult.error;
    }
    const result = await service.updateEmployee(organizationId, employeeId, parseResult.data);
    return { statusCode: 200, body: JSON.stringify(result) };
};

export const handler = commonMiddleware(baseHandler);
