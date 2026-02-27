import { Entity } from "electrodb";
import { client } from "../clients/dynamodb";

const table = process.env.TABLE_NAME || "versa-table";

export const DelegateEntity = new Entity(
    {
        model: {
            entity: "delegate",
            version: "1",
            service: "versa",
        },
        attributes: {
            organizationId: { type: "string", required: true },
            delegateId: { type: "string", required: true },
            accountId: { type: "string", required: true },
            email: { type: "string", required: true },
            name: { type: "string", required: true },
            permissions: { type: "list", items: { type: "string" } },
            status: { type: ["active", "inactive"] as const, required: true, default: "active" },
            createdAt: { type: "number", default: () => Date.now(), readOnly: true },
            updatedAt: { type: "number", watch: "*", set: () => Date.now(), readOnly: true },
        },
        indexes: {
            byDelegateId: {
                pk: { field: "pk", composite: ["organizationId", "delegateId"] },
                sk: { field: "sk", composite: [] },
            },
            byAccountId: {
                index: "gsi1",
                pk: { field: "gsi1pk", composite: ["organizationId", "accountId"] },
                sk: { field: "gsi1sk", composite: ["delegateId"] },
            },
            byOrg: {
                index: "gsi2",
                pk: { field: "gsi2pk", composite: [] },
                sk: { field: "gsi2sk", composite: ["organizationId", "delegateId"] },
            },
        },
    },
    { client, table }
);
