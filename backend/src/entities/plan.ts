import { Entity } from "electrodb";
import { client } from "../clients/dynamodb";

const table = process.env.TABLE_NAME || "versa-table";

export const PlanEntity = new Entity(
    {
        model: {
            entity: "plan",
            version: "1",
            service: "versa",
        },
        attributes: {
            organizationId: { type: "string", required: true },
            planId: { type: "string", required: true },
            name: { type: "string", required: true },
            description: { type: "string" },
            monthlyPrice: { type: "number", required: true },
            annualPrice: { type: "number" },
            status: { type: ["active", "inactive"] as const, required: true, default: "active" },
            createdAt: { type: "number", default: () => Date.now(), readOnly: true },
            updatedAt: { type: "number", watch: "*", set: () => Date.now(), readOnly: true },
        },
        indexes: {
            byPlanId: {
                pk: { field: "pk", composite: ["organizationId", "planId"] },
                sk: { field: "sk", composite: [] },
            },
            byOrgPlans: {
                index: "gsi1",
                pk: { field: "gsi1pk", composite: ["organizationId"] },
                sk: { field: "gsi1sk", composite: ["planId"] },
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
