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
            organizationId: { type: "string", required: true },
            serviceTypeId: { type: "string", required: true },
            name: { type: "string", required: true },
            description: { type: "string" },
            category: { type: "string" },
            createdAt: { type: "number", default: () => Date.now(), readOnly: true },
            updatedAt: { type: "number", watch: "*", set: () => Date.now(), readOnly: true },
        },
        indexes: {
            byServiceTypeId: {
                pk: { field: "pk", composite: ["organizationId", "serviceTypeId"] },
                sk: { field: "sk", composite: [] },
            },
            byOrg: {
                index: "gsi2",
                pk: { field: "gsi2pk", composite: [] },
                sk: { field: "gsi2sk", composite: ["organizationId", "serviceTypeId"] },
            },
        },
    },
    { client, table }
);
