import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { logger } from "../../lib/observability";
import { commonMiddleware, getOrgId } from "../../lib/middleware";
import { DynamoSubcontractorRepository } from "../../adapters/dynamo-subcontractor-repository";
import { EventBridgePublisher } from "../../adapters/event-bridge-publisher";
import { SubcontractorService } from "../../application/subcontractor-service";

const repository = new DynamoSubcontractorRepository();
const publisher = new EventBridgePublisher(process.env.EVENT_BUS_NAME || "");
const service = new SubcontractorService(repository, publisher);

const baseHandler = async (event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> => {
    logger.addContext(context);
    const organizationId = getOrgId(event);
    const limit = event.queryStringParameters?.limit ? parseInt(event.queryStringParameters.limit) : undefined;
    const cursor = event.queryStringParameters?.cursor || undefined;
    const result = await service.listSubcontractors(organizationId, { limit, cursor });
    return { statusCode: 200, body: JSON.stringify(result) };
};

export const handler = commonMiddleware(baseHandler);
