import { Entity } from "electrodb";
import { client } from "../clients/dynamodb";

const table = process.env.TABLE_NAME || "versa-table";

export const SubcontractorEntity = new Entity(
    {
        model: {
            entity: "subcontractor",
            version: "1",
            service: "versa",
        },
        attributes: {
            organizationId: { type: "string", required: true },
            subcontractorId: { type: "string", required: true },
            name: { type: "string", required: true },
            contactName: { type: "string" },
            email: { type: "string", required: true },
            phone: { type: "string" },
            status: { type: ["active", "inactive"] as const, required: true, default: "active" },
            notes: { type: "string" },
            createdAt: { type: "number", default: () => Date.now(), readOnly: true },
            updatedAt: { type: "number", watch: "*", set: () => Date.now(), readOnly: true },
        },
        indexes: {
            bySubcontractorId: {
                pk: { field: "pk", composite: ["organizationId", "subcontractorId"] },
                sk: { field: "sk", composite: [] },
            },
            byStatus: {
                index: "gsi1",
                pk: { field: "gsi1pk", composite: ["organizationId", "status"] },
                sk: { field: "gsi1sk", composite: ["subcontractorId"] },
            },
            byOrg: {
                index: "gsi2",
                pk: { field: "gsi2pk", composite: [] },
                sk: { field: "gsi2sk", composite: ["organizationId", "subcontractorId"] },
            },
        },
    },
    { client, table }
);
