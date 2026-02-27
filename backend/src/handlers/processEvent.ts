import { EventBridgeEvent } from "aws-lambda";
import { logger } from "../lib/observability";

export const handler = async (event: EventBridgeEvent<string, Record<string, unknown>>) => {
    logger.info("Received EventBridge Event", { event });

    if (event.source !== 'versa.api') {
        logger.warn("Received event from unexpected source", { source: event.source });
        return;
    }

    const detailType = event["detail-type"];

    switch (detailType) {
        case "CustomerCreated":
            logger.info("Processing CustomerCreated event", { detail: event.detail });
            break;
        case "CustomerStatusChanged":
            logger.info("Processing CustomerStatusChanged event", { detail: event.detail });
            break;
        case "PropertyCreated":
            logger.info("Processing PropertyCreated event", { detail: event.detail });
            break;
        case "PropertyServiceActivated":
            logger.info("Processing PropertyServiceActivated event", { detail: event.detail });
            break;
        case "ServiceScheduleCreated":
            logger.info("Processing ServiceScheduleCreated event", { detail: event.detail });
            break;
        case "InvoiceCreated":
            logger.info("Processing InvoiceCreated event", { detail: event.detail });
            break;
        case "InvoicePaid":
            logger.info("Processing InvoicePaid event", { detail: event.detail });
            break;
        case "OrganizationCreated":
            logger.info("Processing OrganizationCreated event", { detail: event.detail });
            break;
        case "OrganizationSuspended":
            logger.info("Processing OrganizationSuspended event", { detail: event.detail });
            break;
        case "OrganizationConfigUpdated":
            logger.info("Processing OrganizationConfigUpdated event", { detail: event.detail });
            break;
        default:
            logger.info(`Processing ${detailType} event`, { detail: event.detail });
            break;
    }

    return;
};
