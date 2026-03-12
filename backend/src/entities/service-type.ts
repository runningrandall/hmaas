import { Entity } from "electrodb";
import { client } from "../clients/dynamodb";

const table = process.env.TABLE_NAME || "versa-table";

export const ServiceTypeEntity = new Entity(
    {
        model: {
            entity: "serviceType",
            version: "1",
            service: "versa",
        },
        attributes: {
            organizationId: { type: "string", required: true },
            serviceTypeId: { type: "string", required: true },
            name: { type: "string", required: true },
            description: { type: "string" },
            basePrice: { type: "number" },
            unit: { type: ["per_visit", "per_hour", "per_sqft", "per_linear_foot", "per_unit", "per_window"] as const },
            estimatedDuration: { type: "number" },
            frequency: { type: ["weekly", "biweekly", "monthly", "quarterly", "biannual", "annually", "one_time"] as const },
            measurementKey: { type: "string" },
            measurementUnit: { type: "string" },
            ratePerUnit: { type: "number" },
            durationPerUnit: { type: "number" },
            createdAt: { type: "number", default: () => Date.now(), readOnly: true },
            updatedAt: { type: "number", watch: "*", set: () => Date.now(), readOnly: true },
        },
        indexes: {
            byServiceTypeId: {
                pk: { field: "pk", composite: ["organizationId", "serviceTypeId"] },
                sk: { field: "sk", composite: [] },
            },
            byOrgServiceTypes: {
                index: "gsi1",
                pk: { field: "gsi1pk", composite: ["organizationId"] },
                sk: { field: "gsi1sk", composite: ["serviceTypeId"] },
            },
            byOrg: {
                index: "gsi2",
                pk: { field: "gsi2pk", composite: [] },
                sk: { field: "gsi2sk", composite: ["organizationId", "serviceTypeId"] },
            },
        },
    },
    { client, table }
);
