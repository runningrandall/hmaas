import { Entity } from "electrodb";
import { client } from "../clients/dynamodb";

const table = process.env.TABLE_NAME || "versa-table";

export const EstimateEntity = new Entity(
    {
        model: {
            entity: "estimate",
            version: "1",
            service: "versa",
        },
        attributes: {
            organizationId: { type: "string", required: true },
            estimateId: { type: "string", required: true },
            customerId: { type: "string", required: true },
            propertyId: { type: "string", required: true },
            estimateNumber: { type: "string", required: true },
            estimateDate: { type: "string", required: true },
            expirationDate: { type: "string" },
            status: {
                type: ["draft", "sent", "accepted", "rejected", "expired", "invoiced"] as const,
                required: true,
                default: "draft",
            },
            subtotal: { type: "number", required: true },
            tax: { type: "number", required: true },
            total: { type: "number", required: true },
            lineItems: {
                type: "list",
                items: {
                    type: "map",
                    properties: {
                        serviceTypeId: { type: "string", required: true },
                        description: { type: "string", required: true },
                        quantity: { type: "number", required: true },
                        unit: { type: "string", required: true },
                        unitPrice: { type: "number", required: true },
                        total: { type: "number", required: true },
                        estimatedDuration: { type: "number" },
                    },
                },
            },
            notes: { type: "string" },
            acceptedAt: { type: "string" },
            invoiceId: { type: "string" },
            createdAt: { type: "number", default: () => Date.now(), readOnly: true },
            updatedAt: { type: "number", watch: "*", set: () => Date.now(), readOnly: true },
        },
        indexes: {
            byEstimateId: {
                pk: { field: "pk", composite: ["organizationId", "estimateId"] },
                sk: { field: "sk", composite: [] },
            },
            byCustomerId: {
                index: "gsi1",
                pk: { field: "gsi1pk", composite: ["organizationId", "customerId"] },
                sk: { field: "gsi1sk", composite: ["estimateDate"] },
            },
            byOrg: {
                index: "gsi2",
                pk: { field: "gsi2pk", composite: [] },
                sk: { field: "gsi2sk", composite: ["organizationId", "estimateId"] },
            },
        },
    },
    { client, table }
);
