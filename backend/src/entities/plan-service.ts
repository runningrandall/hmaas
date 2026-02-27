import { Entity } from "electrodb";
import { client } from "../clients/dynamodb";

const table = process.env.TABLE_NAME || "versa-table";

export const PlanServiceEntity = new Entity(
    {
        model: {
            entity: "planService",
            version: "1",
            service: "versa",
        },
        attributes: {
            organizationId: { type: "string", required: true },
            planId: { type: "string", required: true },
            serviceTypeId: { type: "string", required: true },
            includedVisits: { type: "number" },
            frequency: { type: "string" },
            createdAt: { type: "number", default: () => Date.now(), readOnly: true },
            updatedAt: { type: "number", watch: "*", set: () => Date.now(), readOnly: true },
        },
        indexes: {
            byPlanAndServiceType: {
                pk: { field: "pk", composite: ["organizationId", "planId"] },
                sk: { field: "sk", composite: ["serviceTypeId"] },
            },
            byOrg: {
                index: "gsi2",
                pk: { field: "gsi2pk", composite: [] },
                sk: { field: "gsi2sk", composite: ["organizationId", "planId"] },
            },
        },
    },
    { client, table }
);
