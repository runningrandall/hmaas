import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { logger } from "../../lib/observability";
import { commonMiddleware } from "../../lib/middleware";
import { AppError } from "../../lib/error";
import { DynamoCapabilityRepository } from "../../adapters/dynamo-capability-repository";
import { EventBridgePublisher } from "../../adapters/event-bridge-publisher";
import { CapabilityService } from "../../application/capability-service";

const repository = new DynamoCapabilityRepository();
const publisher = new EventBridgePublisher(process.env.EVENT_BUS_NAME || "");
const service = new CapabilityService(repository, publisher);

const baseHandler = async (event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> => {
    logger.addContext(context);
    const capabilityId = event.pathParameters?.capabilityId;
    if (!capabilityId) {
        throw new AppError("Missing capabilityId", 400);
    }
    await service.deleteCapability(capabilityId);
    return { statusCode: 200, body: JSON.stringify({ message: "Capability deleted" }) };
};

export const handler = commonMiddleware(baseHandler);
