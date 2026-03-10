import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { logger } from "../../lib/observability";
import { commonMiddleware, getOrgId } from "../../lib/middleware";
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
    const organizationId = getOrgId(event);
    const estimateId = event.pathParameters?.estimateId;
    if (!estimateId) {
        throw new AppError("Missing estimateId", 400);
    }
    await service.deleteEstimate(organizationId, estimateId);
    return { statusCode: 200, body: JSON.stringify({ message: "Estimate deleted" }) };
};

export const handler = commonMiddleware(baseHandler);
