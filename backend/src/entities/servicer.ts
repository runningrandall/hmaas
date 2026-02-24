import { Entity } from "electrodb";
import { client } from "../clients/dynamodb";

const table = process.env.TABLE_NAME || "versa-table";

export const ServicerEntity = new Entity(
    {
        model: {
            entity: "servicer",
            version: "1",
            service: "versa",
        },
        attributes: {
            servicerId: { type: "string", required: true },
            employeeId: { type: "string", required: true },
            serviceArea: { type: "string" },
            maxDailyJobs: { type: "number" },
            rating: { type: "number" },
            status: { type: ["active", "inactive"] as const, required: true, default: "active" },
            createdAt: { type: "number", default: () => Date.now(), readOnly: true },
            updatedAt: { type: "number", watch: "*", set: () => Date.now(), readOnly: true },
        },
        indexes: {
            byServicerId: {
                pk: { field: "pk", composite: ["servicerId"] },
                sk: { field: "sk", composite: [] },
            },
            byEmployeeId: {
                index: "gsi1",
                pk: { field: "gsi1pk", composite: ["employeeId"] },
                sk: { field: "gsi1sk", composite: ["servicerId"] },
            },
        },
    },
    { client, table }
);
