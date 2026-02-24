import { Entity } from "electrodb";
import { client } from "../clients/dynamodb";

const table = process.env.TABLE_NAME || "versa-table";

export const CostTypeEntity = new Entity(
    {
        model: {
            entity: "costType",
            version: "1",
            service: "versa",
        },
        attributes: {
            costTypeId: { type: "string", required: true },
            name: { type: "string", required: true },
            description: { type: "string" },
            createdAt: { type: "number", default: () => Date.now(), readOnly: true },
            updatedAt: { type: "number", watch: "*", set: () => Date.now(), readOnly: true },
        },
        indexes: {
            byCostTypeId: {
                pk: { field: "pk", composite: ["costTypeId"] },
                sk: { field: "sk", composite: [] },
            },
        },
    },
    { client, table }
);
