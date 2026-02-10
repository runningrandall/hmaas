import { APIGatewayProxyHandler } from "aws-lambda";
import { ItemEntity } from "../entities/item";
import { logger } from "../lib/observability";

export const handler: APIGatewayProxyHandler = async (event, context) => {
    logger.addContext(context);
    try {
        const itemId = event.pathParameters?.itemId;
        if (!itemId) {
            logger.warn("Missing itemId in path parameters");
            return { statusCode: 400, body: JSON.stringify({ error: "Missing itemId" }) };
        }

        const result = await ItemEntity.get({ itemId }).go();

        if (!result.data) {
            logger.warn("Item not found", { itemId });
            return { statusCode: 404, body: JSON.stringify({ error: "Item not found" }) };
        }

        return {
            statusCode: 200,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify(result.data),
        };
    } catch (error: any) {
        logger.error("Error getting item", { error });
        return {
            statusCode: 500,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ error: error.message }),
        };
    }
};
