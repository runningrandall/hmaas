import { Entity } from "electrodb";
import { client } from "../clients/dynamodb";

const table = process.env.TABLE_NAME || "versa-table";

export const CapabilityEntity = new Entity(
    {
        model: {
            entity: "capability",
            version: "1",
            service: "versa",
        },
        attributes: {
            capabilityId: { type: "string", required: true },
            employeeId: { type: "string", required: true },
            serviceTypeId: { type: "string", required: true },
            level: { type: ["beginner", "intermediate", "expert"] as const, required: true },
            certificationDate: { type: "string" },
            createdAt: { type: "number", default: () => Date.now(), readOnly: true },
            updatedAt: { type: "number", watch: "*", set: () => Date.now(), readOnly: true },
        },
        indexes: {
            byCapabilityId: {
                pk: { field: "pk", composite: ["capabilityId"] },
                sk: { field: "sk", composite: [] },
            },
            byEmployeeId: {
                index: "gsi1",
                pk: { field: "gsi1pk", composite: ["employeeId"] },
                sk: { field: "gsi1sk", composite: ["capabilityId"] },
            },
        },
    },
    { client, table }
);
