import { Entity } from "electrodb";
import { client } from "../clients/dynamodb";

const table = process.env.TABLE_NAME || "versa-table";

export const OrganizationEntity = new Entity(
    {
        model: {
            entity: "organization",
            version: "1",
            service: "versa",
        },
        attributes: {
            organizationId: { type: "string", required: true },
            name: { type: "string", required: true },
            slug: { type: "string", required: true },
            status: { type: ["active", "inactive", "suspended"] as const, required: true, default: "active" },
            ownerUserId: { type: "string", required: true },
            billingEmail: { type: "string", required: true },
            phone: { type: "string" },
            address: { type: "string" },
            city: { type: "string" },
            state: { type: "string" },
            zip: { type: "string" },
            timezone: { type: "string", default: "America/Denver" },
            config: {
                type: "map",
                properties: {
                    googleMapsApiKey: { type: "string" },
                    defaultPlanId: { type: "string" },
                    invoiceDayOfMonth: { type: "number" },
                    brandColor: { type: "string" },
                    logoUrl: { type: "string" },
                },
            },
            secretsArn: { type: "string" },
            createdAt: { type: "number", default: () => Date.now(), readOnly: true },
            updatedAt: { type: "number", watch: "*", set: () => Date.now(), readOnly: true },
        },
        indexes: {
            byOrganizationId: {
                pk: { field: "pk", composite: ["organizationId"] },
                sk: { field: "sk", composite: [] },
            },
            bySlug: {
                index: "gsi1",
                pk: { field: "gsi1pk", composite: ["slug"] },
                sk: { field: "gsi1sk", composite: ["organizationId"] },
            },
            byStatus: {
                index: "gsi2",
                pk: { field: "gsi2pk", composite: ["status"] },
                sk: { field: "gsi2sk", composite: ["organizationId"] },
            },
        },
    },
    { client, table }
);
