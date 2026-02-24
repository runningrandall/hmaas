import { Entity } from "electrodb";
import { client } from "../clients/dynamodb";

const table = process.env.TABLE_NAME || "versa-table";

export const PropertyServiceEntity = new Entity(
    {
        model: {
            entity: "propertyService",
            version: "1",
            service: "versa",
        },
        attributes: {
            serviceId: { type: "string", required: true },
            propertyId: { type: "string", required: true },
            serviceTypeId: { type: "string", required: true },
            planId: { type: "string" },
            status: { type: ["active", "inactive", "cancelled"] as const, required: true, default: "active" },
            startDate: { type: "string" },
            endDate: { type: "string" },
            frequency: { type: "string" },
            createdAt: { type: "number", default: () => Date.now(), readOnly: true },
            updatedAt: { type: "number", watch: "*", set: () => Date.now(), readOnly: true },
        },
        indexes: {
            byServiceId: {
                pk: { field: "pk", composite: ["serviceId"] },
                sk: { field: "sk", composite: [] },
            },
            byPropertyId: {
                index: "gsi1",
                pk: { field: "gsi1pk", composite: ["propertyId"] },
                sk: { field: "gsi1sk", composite: ["serviceId"] },
            },
        },
    },
    { client, table }
);
