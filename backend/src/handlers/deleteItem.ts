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

        await ItemEntity.delete({ itemId }).go();
        logger.info("Item deleted", { itemId });

        return {
            statusCode: 200,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ message: "Item deleted" }),
        };
    } catch (error: any) {
        logger.error("Error deleting item", { error });
        return {
            statusCode: 500,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ error: error.message }),
        };
    }
};
