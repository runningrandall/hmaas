import { Entity } from "electrodb";
import { client } from "../clients/dynamodb";

const table = process.env.TABLE_NAME || "versa-table";

export const InvoiceEntity = new Entity(
    {
        model: {
            entity: "invoice",
            version: "1",
            service: "versa",
        },
        attributes: {
            organizationId: { type: "string", required: true },
            invoiceId: { type: "string", required: true },
            customerId: { type: "string", required: true },
            invoiceNumber: { type: "string", required: true },
            invoiceDate: { type: "string", required: true },
            dueDate: { type: "string", required: true },
            subtotal: { type: "number", required: true },
            tax: { type: "number", required: true },
            total: { type: "number", required: true },
            status: {
                type: ["draft", "sent", "paid", "overdue", "cancelled"] as const,
                required: true,
                default: "draft",
            },
            lineItems: {
                type: "list",
                items: {
                    type: "map",
                    properties: {
                        description: { type: "string", required: true },
                        quantity: { type: "number", required: true },
                        unitPrice: { type: "number", required: true },
                        total: { type: "number", required: true },
                    },
                },
            },
            paidAt: { type: "string" },
            createdAt: { type: "number", default: () => Date.now(), readOnly: true },
            updatedAt: { type: "number", watch: "*", set: () => Date.now(), readOnly: true },
        },
        indexes: {
            byInvoiceId: {
                pk: { field: "pk", composite: ["organizationId", "invoiceId"] },
                sk: { field: "sk", composite: [] },
            },
            byCustomerId: {
                index: "gsi1",
                pk: { field: "gsi1pk", composite: ["organizationId", "customerId"] },
                sk: { field: "gsi1sk", composite: ["invoiceDate"] },
            },
            byOrg: {
                index: "gsi2",
                pk: { field: "gsi2pk", composite: [] },
                sk: { field: "gsi2sk", composite: ["organizationId", "invoiceId"] },
            },
        },
    },
    { client, table }
);
