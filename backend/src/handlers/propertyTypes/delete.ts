import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { logger } from "../../lib/observability";
import { commonMiddleware } from "../../lib/middleware";
import { AppError } from "../../lib/error";
import { DynamoPropertyTypeRepository } from "../../adapters/dynamo-property-type-repository";
import { EventBridgePublisher } from "../../adapters/event-bridge-publisher";
import { PropertyTypeService } from "../../application/property-type-service";

const repository = new DynamoPropertyTypeRepository();
const publisher = new EventBridgePublisher(process.env.EVENT_BUS_NAME || "");
const service = new PropertyTypeService(repository, publisher);

const baseHandler = async (event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> => {
    logger.addContext(context);
    const propertyTypeId = event.pathParameters?.propertyTypeId;
    if (!propertyTypeId) {
        throw new AppError("Missing propertyTypeId", 400);
    }
    await service.deletePropertyType(propertyTypeId);
    return { statusCode: 200, body: JSON.stringify({ message: "Property type deleted" }) };
};

export const handler = commonMiddleware(baseHandler);
