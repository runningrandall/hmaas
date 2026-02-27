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
            organizationId: { type: "string", required: true },
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
                pk: { field: "pk", composite: ["organizationId", "costId"] },
                sk: { field: "sk", composite: [] },
            },
            byServiceId: {
                index: "gsi1",
                pk: { field: "gsi1pk", composite: ["organizationId", "serviceId"] },
                sk: { field: "gsi1sk", composite: ["costId"] },
            },
            byOrg: {
                index: "gsi2",
                pk: { field: "gsi2pk", composite: [] },
                sk: { field: "gsi2sk", composite: ["organizationId", "costId"] },
            },
        },
    },
    { client, table }
);
