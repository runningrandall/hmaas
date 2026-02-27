import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { logger } from "../../lib/observability";
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
    const result = await service.getEmployee(organizationId, employeeId);
    return { statusCode: 200, body: JSON.stringify(result) };
};

export const handler = commonMiddleware(baseHandler);
