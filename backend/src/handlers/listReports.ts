import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, QueryCommandInput } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.REPORTS_TABLE || '';

export const handler: APIGatewayProxyHandler = async (event) => {
    console.log('Received event:', JSON.stringify(event, null, 2));

    try {
        const { limit = '20', nextToken, search } = event.queryStringParameters || {};
        const limitNum = parseInt(limit, 10) || 20;

        const params: QueryCommandInput = {
            TableName: TABLE_NAME,
            IndexName: 'ByDate',
            KeyConditionExpression: '#type = :type',
            ExpressionAttributeNames: { '#type': 'type' },
            ExpressionAttributeValues: { ':type': 'REPORT' },
            ScanIndexForward: false, // Descending order (newest first)
            Limit: limitNum,
        };

        if (nextToken) {
            params.ExclusiveStartKey = JSON.parse(Buffer.from(nextToken, 'base64').toString('utf-8'));
        }

        if (search) {
            const lowerSearch = search.toLowerCase();
            params.FilterExpression = 'contains(#name, :search) OR contains(email, :search) OR contains(phone, :search) OR contains(description, :search) OR contains(locationDescription, :search)';
            params.ExpressionAttributeNames = {
                ...params.ExpressionAttributeNames,
                '#name': 'name', // Name is reserved
            };
            params.ExpressionAttributeValues = {
                ...params.ExpressionAttributeValues,
                ':search': lowerSearch, // Note: This is case-sensitive in DynamoDB unless we normalize data. 
                // For now, we assume user accepts partial matches. 
                // DynamoDB 'contains' is case-sensitive. 
                // To do true case-insensitive, we'd need a normalized field.
                // We'll proceed with direct contains for now as per previous plan.
            };
            // Note: FilterExpression applies AFTER Query. 
            // If Limit is applied, it limits the items SCANNED by the Query, then filters.
            // This might result in fewer than 'Limit' items returned.
            // But nextToken will still allow pagination.
        }

        const command = new QueryCommand(params);
        const response = await docClient.send(command);

        const items = response.Items || [];
        const nextTokenOut = response.LastEvaluatedKey
            ? Buffer.from(JSON.stringify(response.LastEvaluatedKey)).toString('base64')
            : null;

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ items, nextToken: nextTokenOut }),
        };
    } catch (error) {
        console.error('Error listing reports:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ message: 'Internal Server Error' }),
        };
    }
};
