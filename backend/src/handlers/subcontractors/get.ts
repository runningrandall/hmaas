import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { logger } from "../../lib/observability";
import { commonMiddleware, getOrgId } from "../../lib/middleware";
import { AppError } from "../../lib/error";
import { DynamoSubcontractorRepository } from "../../adapters/dynamo-subcontractor-repository";
import { EventBridgePublisher } from "../../adapters/event-bridge-publisher";
import { SubcontractorService } from "../../application/subcontractor-service";

const repository = new DynamoSubcontractorRepository();
const publisher = new EventBridgePublisher(process.env.EVENT_BUS_NAME || "");
const service = new SubcontractorService(repository, publisher);

const baseHandler = async (event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> => {
    logger.addContext(context);
    const organizationId = getOrgId(event);
    const subcontractorId = event.pathParameters?.subcontractorId;
    if (!subcontractorId) {
        throw new AppError("Missing subcontractorId", 400);
    }
    const result = await service.getSubcontractor(organizationId, subcontractorId);
    return { statusCode: 200, body: JSON.stringify(result) };
};

export const handler = commonMiddleware(baseHandler);
