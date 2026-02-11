"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const crypto_1 = require("crypto");
const s3Client = new client_s3_1.S3Client({});
const BUCKET_NAME = process.env.BUCKET_NAME || '';
const handler = async (event) => {
    console.log('Received event:', JSON.stringify(event, null, 2));
    try {
        const contentType = event.queryStringParameters?.contentType || 'image/jpeg';
        // Basic validation for image types
        if (!contentType.startsWith('image/')) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ message: 'Invalid content type. Must be an image.' }),
            };
        }
        const fileExtension = contentType.split('/')[1] || 'jpeg';
        const key = `uploads/${(0, crypto_1.randomUUID)()}.${fileExtension}`;
        const command = new client_s3_1.PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            ContentType: contentType,
        });
        // Expires in 5 minutes
        const uploadUrl = await (0, s3_request_presigner_1.getSignedUrl)(s3Client, command, { expiresIn: 300 });
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ uploadUrl, key }),
        };
    }
    catch (error) {
        console.error('Error generating upload URL:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ message: 'Internal Server Error' }),
        };
    }
};
exports.handler = handler;
