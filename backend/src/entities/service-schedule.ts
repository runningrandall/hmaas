import { Entity } from "electrodb";
import { client } from "../clients/dynamodb";

const table = process.env.TABLE_NAME || "versa-table";

export const ServiceScheduleEntity = new Entity(
    {
        model: {
            entity: "serviceSchedule",
            version: "1",
            service: "versa",
        },
        attributes: {
            organizationId: { type: "string", required: true },
            serviceScheduleId: { type: "string", required: true },
            serviceId: { type: "string", required: true },
            servicerId: { type: "string", required: true },
            scheduledDate: { type: "string", required: true },
            scheduledTime: { type: "string" },
            estimatedDuration: { type: "number" },
            status: { type: ["scheduled", "in_progress", "completed", "cancelled"] as const, required: true, default: "scheduled" },
            completedAt: { type: "string" },
            createdAt: { type: "number", default: () => Date.now(), readOnly: true },
            updatedAt: { type: "number", watch: "*", set: () => Date.now(), readOnly: true },
        },
        indexes: {
            byServiceScheduleId: {
                pk: { field: "pk", composite: ["organizationId", "serviceScheduleId"] },
                sk: { field: "sk", composite: [] },
            },
            byServicerId: {
                index: "gsi1",
                pk: { field: "gsi1pk", composite: ["organizationId", "servicerId"] },
                sk: { field: "gsi1sk", composite: ["scheduledDate"] },
            },
            byOrg: {
                index: "gsi2",
                pk: { field: "gsi2pk", composite: [] },
                sk: { field: "gsi2sk", composite: ["organizationId", "serviceScheduleId"] },
            },
        },
    },
    { client, table }
);
