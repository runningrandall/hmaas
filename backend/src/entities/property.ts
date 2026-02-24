import { Entity } from "electrodb";
import { client } from "../clients/dynamodb";

const table = process.env.TABLE_NAME || "versa-table";

export const PropertyEntity = new Entity(
    {
        model: { entity: "property", version: "1", service: "versa" },
        attributes: {
            propertyId: { type: "string", required: true },
            customerId: { type: "string", required: true },
            propertyTypeId: { type: "string", required: true },
            name: { type: "string", required: true },
            address: { type: "string", required: true },
            city: { type: "string", required: true },
            state: { type: "string", required: true },
            zip: { type: "string", required: true },
            lat: { type: "number" },
            lng: { type: "number" },
            lotSize: { type: "number" },
            notes: { type: "string" },
            status: { type: ["active", "inactive"] as const, required: true, default: "active" },
            createdAt: { type: "number", default: () => Date.now(), readOnly: true },
            updatedAt: { type: "number", watch: "*", set: () => Date.now(), readOnly: true },
        },
        indexes: {
            byPropertyId: {
                pk: { field: "pk", composite: ["propertyId"] },
                sk: { field: "sk", composite: [] },
            },
            byCustomerId: {
                index: "gsi1",
                pk: { field: "gsi1pk", composite: ["customerId"] },
                sk: { field: "gsi1sk", composite: ["propertyId"] },
            },
        },
    },
    { client, table }
);
