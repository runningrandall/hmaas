import { Entity } from "electrodb";
import { client } from "../clients/dynamodb";

const table = process.env.TABLE_NAME || "versa-table";

export const AccountEntity = new Entity(
    {
        model: {
            entity: "account",
            version: "1",
            service: "versa",
        },
        attributes: {
            organizationId: { type: "string", required: true },
            accountId: { type: "string", required: true },
            customerId: { type: "string", required: true },
            cognitoUserId: { type: "string" },
            planId: { type: "string" },
            status: { type: ["active", "inactive", "suspended"] as const, required: true, default: "active" },
            billingEmail: { type: "string" },
            createdAt: { type: "number", default: () => Date.now(), readOnly: true },
            updatedAt: { type: "number", watch: "*", set: () => Date.now(), readOnly: true },
        },
        indexes: {
            byAccountId: {
                pk: { field: "pk", composite: ["organizationId", "accountId"] },
                sk: { field: "sk", composite: [] },
            },
            byCustomerId: {
                index: "gsi1",
                pk: { field: "gsi1pk", composite: ["organizationId", "customerId"] },
                sk: { field: "gsi1sk", composite: ["accountId"] },
            },
            byOrg: {
                index: "gsi2",
                pk: { field: "gsi2pk", composite: [] },
                sk: { field: "gsi2sk", composite: ["organizationId", "accountId"] },
            },
        },
    },
    { client, table }
);
