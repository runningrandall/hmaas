"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const client = new client_dynamodb_1.DynamoDBClient({});
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
const s3Client = new client_s3_1.S3Client({});
const TABLE_NAME = process.env.REPORTS_TABLE || '';
const BUCKET_NAME = process.env.BUCKET_NAME || '';
const handler = async (event) => {
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
        const response = await docClient.send(new lib_dynamodb_1.GetCommand({
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
        const imageKeys = report.imageKeys || [];
        // Generate presigned URLs for images
        const imageUrls = await Promise.all(imageKeys.map(async (key) => {
            if (!BUCKET_NAME)
                return null;
            try {
                const command = new client_s3_1.GetObjectCommand({
                    Bucket: BUCKET_NAME,
                    Key: key,
                });
                return await (0, s3_request_presigner_1.getSignedUrl)(s3Client, command, { expiresIn: 3600 }); // 1 hour expiration
            }
            catch (err) {
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
    }
    catch (error) {
        console.error('Error getting report:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ message: 'Internal Server Error' }),
        };
    }
};
exports.handler = handler;
