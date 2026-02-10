import { APIGatewayProxyHandler } from "aws-lambda";
import { ItemEntity } from "../entities/item";
import { logger } from "../lib/observability";

export const handler: APIGatewayProxyHandler = async (event, context) => {
    logger.addContext(context);
    try {
        const result = await ItemEntity.scan.go();

        return {
            statusCode: 200,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify(result.data),
        };
    } catch (error: any) {
        logger.error("Error listing items", { error });
        return {
            statusCode: 500,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ error: error.message }),
        };
    }
};
