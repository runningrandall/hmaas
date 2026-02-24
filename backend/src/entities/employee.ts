import { Entity } from "electrodb";
import { client } from "../clients/dynamodb";

const table = process.env.TABLE_NAME || "versa-table";

export const EmployeeEntity = new Entity(
    {
        model: {
            entity: "employee",
            version: "1",
            service: "versa",
        },
        attributes: {
            employeeId: { type: "string", required: true },
            firstName: { type: "string", required: true },
            lastName: { type: "string", required: true },
            email: { type: "string", required: true },
            phone: { type: "string" },
            role: { type: "string", required: true },
            status: { type: ["active", "inactive", "terminated"] as const, required: true, default: "active" },
            hireDate: { type: "string" },
            createdAt: { type: "number", default: () => Date.now(), readOnly: true },
            updatedAt: { type: "number", watch: "*", set: () => Date.now(), readOnly: true },
        },
        indexes: {
            byEmployeeId: {
                pk: { field: "pk", composite: ["employeeId"] },
                sk: { field: "sk", composite: [] },
            },
            byStatus: {
                index: "gsi1",
                pk: { field: "gsi1pk", composite: ["status"] },
                sk: { field: "gsi1sk", composite: ["employeeId"] },
            },
        },
    },
    { client, table }
);
