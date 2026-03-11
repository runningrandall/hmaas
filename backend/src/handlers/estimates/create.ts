import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { logger, metrics } from "../../lib/observability";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { GenerateEstimateSchema } from "../../lib/estimate-schemas";
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
    const body = event.body as unknown as any;
    if (!body) {
        throw new AppError("Missing request body", 400);
    }
    const parseResult = GenerateEstimateSchema.safeParse(body);
    if (!parseResult.success) {
        logger.warn("Validation failed", { issues: parseResult.error.issues });
        metrics.addMetric('ValidationErrors', MetricUnit.Count, 1);
        throw parseResult.error;
    }
    const result = await service.generateEstimate(organizationId, parseResult.data);
    return { statusCode: 201, body: JSON.stringify(result) };
};

export const handler = commonMiddleware(baseHandler);
