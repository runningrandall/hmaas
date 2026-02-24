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
                pk: { field: "pk", composite: ["planId"] },
                sk: { field: "sk", composite: [] },
            },
        },
    },
    { client, table }
);
