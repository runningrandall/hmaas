import { Entity } from "electrodb";
import { client } from "../clients/dynamodb";

const table = process.env.TABLE_NAME || "versa-table";

export const CostEntity = new Entity(
    {
        model: {
            entity: "cost",
            version: "1",
            service: "versa",
        },
        attributes: {
            costId: { type: "string", required: true },
            serviceId: { type: "string", required: true },
            costTypeId: { type: "string", required: true },
            amount: { type: "number", required: true },
            description: { type: "string" },
            effectiveDate: { type: "string" },
            createdAt: { type: "number", default: () => Date.now(), readOnly: true },
            updatedAt: { type: "number", watch: "*", set: () => Date.now(), readOnly: true },
        },
        indexes: {
            byCostId: {
                pk: { field: "pk", composite: ["costId"] },
                sk: { field: "sk", composite: [] },
            },
            byServiceId: {
                index: "gsi1",
                pk: { field: "gsi1pk", composite: ["serviceId"] },
                sk: { field: "gsi1sk", composite: ["costId"] },
            },
        },
    },
    { client, table }
);
