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
            organizationId: { type: "string", required: true },
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
                pk: { field: "pk", composite: ["organizationId", "payScheduleId"] },
                sk: { field: "sk", composite: [] },
            },
            byOrgSchedules: {
                index: "gsi1",
                pk: { field: "gsi1pk", composite: ["organizationId"] },
                sk: { field: "gsi1sk", composite: ["payScheduleId"] },
            },
            byOrg: {
                index: "gsi2",
                pk: { field: "gsi2pk", composite: [] },
                sk: { field: "gsi2sk", composite: ["organizationId", "payScheduleId"] },
            },
        },
    },
    { client, table }
);
