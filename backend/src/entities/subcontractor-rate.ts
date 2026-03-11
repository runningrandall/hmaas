import { Entity } from "electrodb";
import { client } from "../clients/dynamodb";

const table = process.env.TABLE_NAME || "versa-table";

export const SubcontractorRateEntity = new Entity(
    {
        model: {
            entity: "subcontractorRate",
            version: "1",
            service: "versa",
        },
        attributes: {
            organizationId: { type: "string", required: true },
            subcontractorRateId: { type: "string", required: true },
            subcontractorId: { type: "string", required: true },
            propertyId: { type: "string", required: true },
            serviceTypeId: { type: "string", required: true },
            rate: { type: "number", required: true },
            unit: { type: "string", required: true },
            effectiveDate: { type: "string" },
            notes: { type: "string" },
            createdAt: { type: "number", default: () => Date.now(), readOnly: true },
            updatedAt: { type: "number", watch: "*", set: () => Date.now(), readOnly: true },
        },
        indexes: {
            bySubcontractorRateId: {
                pk: { field: "pk", composite: ["organizationId", "subcontractorRateId"] },
                sk: { field: "sk", composite: [] },
            },
            bySubcontractorId: {
                index: "gsi1",
                pk: { field: "gsi1pk", composite: ["organizationId", "subcontractorId"] },
                sk: { field: "gsi1sk", composite: ["subcontractorRateId"] },
            },
            byOrg: {
                index: "gsi2",
                pk: { field: "gsi2pk", composite: [] },
                sk: { field: "gsi2sk", composite: ["organizationId", "subcontractorRateId"] },
            },
        },
    },
    { client, table }
);
