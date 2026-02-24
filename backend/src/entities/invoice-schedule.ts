import { Entity } from "electrodb";
import { client } from "../clients/dynamodb";

const table = process.env.TABLE_NAME || "versa-table";

export const InvoiceScheduleEntity = new Entity(
    {
        model: {
            entity: "invoiceSchedule",
            version: "1",
            service: "versa",
        },
        attributes: {
            invoiceScheduleId: { type: "string", required: true },
            customerId: { type: "string", required: true },
            frequency: {
                type: ["monthly", "quarterly", "annually"] as const,
                required: true,
            },
            nextInvoiceDate: { type: "string", required: true },
            dayOfMonth: { type: "number" },
            createdAt: { type: "number", default: () => Date.now(), readOnly: true },
            updatedAt: { type: "number", watch: "*", set: () => Date.now(), readOnly: true },
        },
        indexes: {
            byInvoiceScheduleId: {
                pk: { field: "pk", composite: ["invoiceScheduleId"] },
                sk: { field: "sk", composite: [] },
            },
            byCustomerId: {
                index: "gsi1",
                pk: { field: "gsi1pk", composite: ["customerId"] },
                sk: { field: "gsi1sk", composite: ["invoiceScheduleId"] },
            },
        },
    },
    { client, table }
);
