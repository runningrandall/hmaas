import { Entity } from "electrodb";
import { client } from "../clients/dynamodb";

const table = process.env.TABLE_NAME || "versa-table";

export const CategoryEntity = new Entity(
    {
        model: {
            entity: "category",
            version: "1",
            service: "versa",
        },
        attributes: {
            organizationId: { type: "string", required: true },
            categoryId: { type: "string", required: true },
            name: { type: "string", required: true },
            description: { type: "string" },
            createdAt: { type: "number", default: () => Date.now(), readOnly: true },
            updatedAt: { type: "number", watch: "*", set: () => Date.now(), readOnly: true },
        },
        indexes: {
            byCategoryId: {
                pk: { field: "pk", composite: ["organizationId", "categoryId"] },
                sk: { field: "sk", composite: [] },
            },
            byOrgCategories: {
                index: "gsi1",
                pk: { field: "gsi1pk", composite: ["organizationId"] },
                sk: { field: "gsi1sk", composite: ["categoryId"] },
            },
            byOrg: {
                index: "gsi2",
                pk: { field: "gsi2pk", composite: [] },
                sk: { field: "gsi2sk", composite: ["organizationId", "categoryId"] },
            },
        },
    },
    { client, table }
);
