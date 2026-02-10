"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const item_1 = require("../entities/item");
const observability_1 = require("../lib/observability");
const handler = async (event, context) => {
    observability_1.logger.addContext(context);
    try {
        const itemId = event.pathParameters?.itemId;
        if (!itemId) {
            observability_1.logger.warn("Missing itemId in path parameters");
            return { statusCode: 400, body: JSON.stringify({ error: "Missing itemId" }) };
        }
        const result = await item_1.ItemEntity.get({ itemId }).go();
        if (!result.data) {
            observability_1.logger.warn("Item not found", { itemId });
            return { statusCode: 404, body: JSON.stringify({ error: "Item not found" }) };
        }
        return {
            statusCode: 200,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify(result.data),
        };
    }
    catch (error) {
        observability_1.logger.error("Error getting item", { error });
        return {
            statusCode: 500,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ error: error.message }),
        };
    }
};
exports.handler = handler;
