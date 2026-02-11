import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.REPORTS_TABLE || '';

export const handler: APIGatewayProxyHandler = async (event) => {
    console.log('Received event:', JSON.stringify(event, null, 2));

    try {
        const body = JSON.parse(event.body || '{}');
        const { name, contact, location, imageKey } = body;

        if (!name || !location || !imageKey) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ message: 'Missing required fields: name, location, imageKey' }),
            };
        }

        const reportId = randomUUID();
        const createdAt = new Date().toISOString();

        const item = {
            reportId,
            createdAt,
            name,
            contact,
            location, // { lat: number, lng: number }
            imageKey,
            status: 'NEW',
        };

        await docClient.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: item,
        }));

        return {
            statusCode: 201,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ message: 'Report created', reportId }),
        };
    } catch (error) {
        console.error('Error creating report:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ message: 'Internal Server Error' }),
        };
    }
};
