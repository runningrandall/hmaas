import { EventBridgeEvent } from "aws-lambda";
import { logger } from "../lib/observability";

export const handler = async (event: EventBridgeEvent<string, any>) => {
    logger.info("Received EventBridge Event", { event });

    // Logic to process event
    if (event["detail-type"] === "ItemCreated") {
        logger.info("Processing ItemCreated event", { itemId: event.detail.itemId });
    }

    return;
};
