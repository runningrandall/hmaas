import { APIGatewayProxyHandler } from "aws-lambda";
import { ItemEntity } from "../entities/item";
import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge";
import { logger, tracer } from "../lib/observability";
import { CreateItemSchema } from "../lib/schemas";
import { randomUUID } from "crypto";

const eventBridge = tracer.captureAWSv3Client(new EventBridgeClient({}));

export const handler: APIGatewayProxyHandler = async (event, context) => {
    const EVENT_BUS_NAME = process.env.EVENT_BUS_NAME;

    // Add context to logger
    logger.addContext(context);

    try {
        if (!event.body) {
            logger.warn("Missing body in request");
            return { statusCode: 400, body: JSON.stringify({ error: "Missing body" }) };
        }

        const parseResult = CreateItemSchema.safeParse(JSON.parse(event.body));

        if (!parseResult.success) {
            const issues = parseResult.error.issues;
            logger.warn("Validation failed", { issues });
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: "Validation failed",
                    details: issues
                })
            };
        }

        const body = parseResult.data;
        const itemId = randomUUID();
        logger.info("Creating item", { itemName: body.name, itemId });

        const itemToCreate = {
            ...body,
            itemId,
        };

        const result = await ItemEntity.create(itemToCreate).go();
        logger.info("Item created successfully", { itemId: result.data.itemId });

        // Publish Event
        if (EVENT_BUS_NAME) {
            try {
                await eventBridge.send(new PutEventsCommand({
                    Entries: [{
                        Source: "hmaas.api",
                        DetailType: "ItemCreated",
                        Detail: JSON.stringify(result.data),
                        EventBusName: EVENT_BUS_NAME,
                    }]
                }));
                logger.info("Published ItemCreated event");
            } catch (err) {
                logger.error("Failed to publish event", { error: err });
                // Don't fail the request if event publishing fails, but log it
            }
        }

        return {
            statusCode: 201,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify(result.data),
        };
    } catch (error: any) {
        logger.error("Error creating item", { error });
        return {
            statusCode: 500,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ error: error.message }),
        };
    }
};
