import { Entity } from "electrodb";
import { client } from "../clients/dynamodb";

const table = process.env.TABLE_NAME || "versa-table";

export const CustomerEntity = new Entity(
    {
        model: {
            entity: "customer",
            version: "1",
            service: "versa",
        },
        attributes: {
            organizationId: { type: "string", required: true },
            customerId: { type: "string", required: true },
            firstName: { type: "string", required: true },
            lastName: { type: "string", required: true },
            email: { type: "string", required: true },
            phone: { type: "string" },
            status: { type: ["active", "inactive", "suspended"] as const, required: true, default: "active" },
            notes: { type: "string" },
            createdAt: { type: "number", default: () => Date.now(), readOnly: true },
            updatedAt: { type: "number", watch: "*", set: () => Date.now(), readOnly: true },
        },
        indexes: {
            byCustomerId: {
                pk: { field: "pk", composite: ["organizationId", "customerId"] },
                sk: { field: "sk", composite: [] },
            },
            byStatus: {
                index: "gsi1",
                pk: { field: "gsi1pk", composite: ["organizationId", "status"] },
                sk: { field: "gsi1sk", composite: ["customerId"] },
            },
            byOrg: {
                index: "gsi2",
                pk: { field: "gsi2pk", composite: [] },
                sk: { field: "gsi2sk", composite: ["organizationId", "customerId"] },
            },
        },
    },
    { client, table }
);
