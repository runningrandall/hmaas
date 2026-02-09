import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

// In a real app complexity this might need X-Ray or other config
const endpoint = process.env.LOCAL_DYNAMODB_ENDPOINT;
const region = process.env.AWS_REGION || "us-east-1";

export const client = new DynamoDBClient({
    ...(endpoint && { endpoint }),
    region,
});
