import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { logger } from "../../lib/observability";
import { commonMiddleware } from "../../lib/middleware";
import { AppError } from "../../lib/error";
import { DynamoDelegateRepository } from "../../adapters/dynamo-delegate-repository";
import { EventBridgePublisher } from "../../adapters/event-bridge-publisher";
import { DelegateService } from "../../application/delegate-service";

const repository = new DynamoDelegateRepository();
const publisher = new EventBridgePublisher(process.env.EVENT_BUS_NAME || "");
const service = new DelegateService(repository, publisher);

const baseHandler = async (event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> => {
    logger.addContext(context);
    const delegateId = event.pathParameters?.delegateId;
    if (!delegateId) {
        throw new AppError("Missing delegateId", 400);
    }
    await service.deleteDelegate(delegateId);
    return { statusCode: 200, body: JSON.stringify({ message: "Delegate deleted" }) };
};

export const handler = commonMiddleware(baseHandler);
