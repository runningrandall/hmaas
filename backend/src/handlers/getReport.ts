import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const s3Client = new S3Client({});

const TABLE_NAME = process.env.REPORTS_TABLE || '';
const BUCKET_NAME = process.env.BUCKET_NAME || '';

export const handler: APIGatewayProxyHandler = async (event) => {
    console.log('Received event:', JSON.stringify(event, null, 2));

    const reportId = event.pathParameters?.reportId;

    if (!reportId) {
        return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ message: 'Missing reportId' }),
        };
    }

    try {
        const response = await docClient.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { reportId },
        }));

        if (!response.Item) {
            return {
                statusCode: 404,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ message: 'Report not found' }),
            };
        }

        const report = response.Item;
        const imageKeys: string[] = report.imageKeys || [];

        // Generate presigned URLs for images
        const imageUrls = await Promise.all(imageKeys.map(async (key) => {
            if (!BUCKET_NAME) return null;
            try {
                const command = new GetObjectCommand({
                    Bucket: BUCKET_NAME,
                    Key: key,
                });
                return await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour expiration
            } catch (err) {
                console.error(`Failed to generate presigned URL for key ${key}:`, err);
                return null; // Or handle error appropriately
            }
        }));

        const validImageUrls = imageUrls.filter(url => url !== null);

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ ...report, imageUrls: validImageUrls }),
        };
    } catch (error) {
        console.error('Error getting report:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ message: 'Internal Server Error' }),
        };
    }
};
