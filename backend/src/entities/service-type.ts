import { Entity } from "electrodb";
import { client } from "../clients/dynamodb";

const table = process.env.TABLE_NAME || "versa-table";

export const ServiceTypeEntity = new Entity(
    {
        model: {
            entity: "serviceType",
            version: "1",
            service: "versa",
        },
        attributes: {
            serviceTypeId: { type: "string", required: true },
            name: { type: "string", required: true },
            description: { type: "string" },
            category: { type: "string" },
            createdAt: { type: "number", default: () => Date.now(), readOnly: true },
            updatedAt: { type: "number", watch: "*", set: () => Date.now(), readOnly: true },
        },
        indexes: {
            byServiceTypeId: {
                pk: { field: "pk", composite: ["serviceTypeId"] },
                sk: { field: "sk", composite: [] },
            },
        },
    },
    { client, table }
);
