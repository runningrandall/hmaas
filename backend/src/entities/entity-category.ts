import { Entity } from "electrodb";
import { client } from "../clients/dynamodb";

const table = process.env.TABLE_NAME || "versa-table";

export const EntityCategoryEntity = new Entity(
    {
        model: {
            entity: "entityCategory",
            version: "1",
            service: "versa",
        },
        attributes: {
            organizationId: { type: "string", required: true },
            entityType: { type: "string", required: true },
            entityId: { type: "string", required: true },
            categoryId: { type: "string", required: true },
            createdAt: { type: "number", default: () => Date.now(), readOnly: true },
            updatedAt: { type: "number", watch: "*", set: () => Date.now(), readOnly: true },
        },
        indexes: {
            byEntityAndCategory: {
                pk: { field: "pk", composite: ["organizationId", "entityType", "entityId"] },
                sk: { field: "sk", composite: ["categoryId"] },
            },
            byCategoryId: {
                index: "gsi1",
                pk: { field: "gsi1pk", composite: ["organizationId", "entityType", "categoryId"] },
                sk: { field: "gsi1sk", composite: ["entityId"] },
            },
            byOrg: {
                index: "gsi2",
                pk: { field: "gsi2pk", composite: [] },
                sk: { field: "gsi2sk", composite: ["organizationId", "entityType", "entityId", "categoryId"] },
            },
        },
    },
    { client, table }
);
