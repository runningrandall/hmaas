import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { logger } from "../../lib/observability";
import { commonMiddleware } from "../../lib/middleware";
import { AppError } from "../../lib/error";
import { DynamoEstimateRepository } from "../../adapters/dynamo-estimate-repository";
import { DynamoPropertyRepository } from "../../adapters/dynamo-property-repository";
import { DynamoServiceTypeRepository } from "../../adapters/dynamo-service-type-repository";
import { DynamoPlanServiceRepository } from "../../adapters/dynamo-plan-service-repository";
import { DynamoInvoiceRepository } from "../../adapters/dynamo-invoice-repository";
import { EventBridgePublisher } from "../../adapters/event-bridge-publisher";
import { EstimateService } from "../../application/estimate-service";

const estimateRepository = new DynamoEstimateRepository();
const propertyRepository = new DynamoPropertyRepository();
const serviceTypeRepository = new DynamoServiceTypeRepository();
const planServiceRepository = new DynamoPlanServiceRepository();
const invoiceRepository = new DynamoInvoiceRepository();
const publisher = new EventBridgePublisher(process.env.EVENT_BUS_NAME || "");
const service = new EstimateService(estimateRepository, propertyRepository, serviceTypeRepository, planServiceRepository, invoiceRepository, publisher);

const baseHandler = async (event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> => {
    logger.addContext(context);
    const organizationId = (event as any).organizationId || event.pathParameters?.organizationId || '';
    const customerId = event.queryStringParameters?.customerId;
    if (!customerId) {
        throw new AppError("Missing customerId query parameter", 400);
    }
    const limit = event.queryStringParameters?.limit ? parseInt(event.queryStringParameters.limit, 10) : undefined;
    const cursor = event.queryStringParameters?.cursor || undefined;
    const result = await service.listEstimatesByCustomer(organizationId, customerId, { limit, cursor });
    return { statusCode: 200, body: JSON.stringify(result) };
};

export const handler = commonMiddleware(baseHandler);
