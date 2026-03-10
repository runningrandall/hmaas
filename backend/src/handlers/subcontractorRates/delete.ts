import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { logger } from "../../lib/observability";
import { commonMiddleware, getOrgId } from "../../lib/middleware";
import { AppError } from "../../lib/error";
import { DynamoSubcontractorRateRepository } from "../../adapters/dynamo-subcontractor-rate-repository";
import { EventBridgePublisher } from "../../adapters/event-bridge-publisher";
import { SubcontractorRateService } from "../../application/subcontractor-rate-service";

const repository = new DynamoSubcontractorRateRepository();
const publisher = new EventBridgePublisher(process.env.EVENT_BUS_NAME || "");
const service = new SubcontractorRateService(repository, publisher);

const baseHandler = async (event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> => {
    logger.addContext(context);
    const organizationId = getOrgId(event);
    const subcontractorRateId = event.pathParameters?.subcontractorRateId;
    if (!subcontractorRateId) {
        throw new AppError("Missing subcontractorRateId", 400);
    }
    await service.deleteRate(organizationId, subcontractorRateId);
    return { statusCode: 200, body: JSON.stringify({ message: "Subcontractor rate deleted" }) };
};

export const handler = commonMiddleware(baseHandler);
