import { Entity } from "electrodb";
import { client } from "../clients/dynamodb";

const table = process.env.TABLE_NAME || "versa-table";

export const PaymentMethodEntity = new Entity(
    {
        model: {
            entity: "paymentMethod",
            version: "1",
            service: "versa",
        },
        attributes: {
            organizationId: { type: "string", required: true },
            paymentMethodId: { type: "string", required: true },
            customerId: { type: "string", required: true },
            type: {
                type: ["credit_card", "debit_card", "bank_account", "ach"] as const,
                required: true,
            },
            last4: { type: "string", required: true },
            isDefault: { type: "boolean", default: false },
            status: {
                type: ["active", "inactive"] as const,
                required: true,
                default: "active",
            },
            createdAt: { type: "number", default: () => Date.now(), readOnly: true },
            updatedAt: { type: "number", watch: "*", set: () => Date.now(), readOnly: true },
        },
        indexes: {
            byPaymentMethodId: {
                pk: { field: "pk", composite: ["organizationId", "paymentMethodId"] },
                sk: { field: "sk", composite: [] },
            },
            byCustomerId: {
                index: "gsi1",
                pk: { field: "gsi1pk", composite: ["organizationId", "customerId"] },
                sk: { field: "gsi1sk", composite: ["paymentMethodId"] },
            },
            byOrg: {
                index: "gsi2",
                pk: { field: "gsi2pk", composite: [] },
                sk: { field: "gsi2sk", composite: ["organizationId", "paymentMethodId"] },
            },
        },
    },
    { client, table }
);
