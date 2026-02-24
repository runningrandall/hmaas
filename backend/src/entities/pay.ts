import { Entity } from "electrodb";
import { client } from "../clients/dynamodb";

const table = process.env.TABLE_NAME || "versa-table";

export const PayEntity = new Entity(
    {
        model: {
            entity: "pay",
            version: "1",
            service: "versa",
        },
        attributes: {
            payId: { type: "string", required: true },
            employeeId: { type: "string", required: true },
            payScheduleId: { type: "string" },
            payType: { type: ["hourly", "salary", "commission", "bonus"] as const, required: true },
            rate: { type: "number", required: true },
            effectiveDate: { type: "string", required: true },
            createdAt: { type: "number", default: () => Date.now(), readOnly: true },
            updatedAt: { type: "number", watch: "*", set: () => Date.now(), readOnly: true },
        },
        indexes: {
            byPayId: {
                pk: { field: "pk", composite: ["payId"] },
                sk: { field: "sk", composite: [] },
            },
            byEmployeeId: {
                index: "gsi1",
                pk: { field: "gsi1pk", composite: ["employeeId"] },
                sk: { field: "gsi1sk", composite: ["payId"] },
            },
        },
    },
    { client, table }
);
