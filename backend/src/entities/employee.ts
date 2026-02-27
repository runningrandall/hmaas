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
            organizationId: { type: "string", required: true },
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
                pk: { field: "pk", composite: ["organizationId", "employeeId"] },
                sk: { field: "sk", composite: [] },
            },
            byStatus: {
                index: "gsi1",
                pk: { field: "gsi1pk", composite: ["organizationId", "status"] },
                sk: { field: "gsi1sk", composite: ["employeeId"] },
            },
            byOrg: {
                index: "gsi2",
                pk: { field: "gsi2pk", composite: [] },
                sk: { field: "gsi2sk", composite: ["organizationId", "employeeId"] },
            },
        },
    },
    { client, table }
);
