import { Entity } from "electrodb";
import { client } from "../clients/dynamodb";

const table = process.env.TABLE_NAME || "versa-table";

export const PayScheduleEntity = new Entity(
    {
        model: {
            entity: "paySchedule",
            version: "1",
            service: "versa",
        },
        attributes: {
            payScheduleId: { type: "string", required: true },
            name: { type: "string", required: true },
            frequency: { type: ["weekly", "biweekly", "semimonthly", "monthly"] as const, required: true },
            dayOfWeek: { type: "number" },
            dayOfMonth: { type: "number" },
            createdAt: { type: "number", default: () => Date.now(), readOnly: true },
            updatedAt: { type: "number", watch: "*", set: () => Date.now(), readOnly: true },
        },
        indexes: {
            byPayScheduleId: {
                pk: { field: "pk", composite: ["payScheduleId"] },
                sk: { field: "sk", composite: [] },
            },
        },
    },
    { client, table }
);
