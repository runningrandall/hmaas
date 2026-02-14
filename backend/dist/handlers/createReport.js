"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client_eventbridge_1 = require("@aws-sdk/client-eventbridge");
const crypto_1 = require("crypto");
const client = new client_dynamodb_1.DynamoDBClient({});
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
const eventBridgeClient = new client_eventbridge_1.EventBridgeClient({});
const TABLE_NAME = process.env.REPORTS_TABLE || '';
const EVENT_BUS_NAME = process.env.EVENT_BUS_NAME || 'default';
const handler = async (event) => {
    console.log('Received event:', JSON.stringify(event, null, 2));
    try {
        const body = JSON.parse(event.body || '{}');
        const { name, email, phone, concernType, description, locationDescription, dateObserved, timeObserved, location, imageKeys, captchaToken } = body;
        // Validation (Name is optional now)
        if (!concernType || !location) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ message: 'Missing required fields: concernType, location' }),
            };
        }
        // Verify captchaToken server-side via Google reCAPTCHA API
        const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY;
        if (recaptchaSecret) {
            if (!captchaToken) {
                return {
                    statusCode: 400,
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                    body: JSON.stringify({ message: 'Missing CAPTCHA token' }),
                };
            }
            try {
                const verifyUrl = 'https://www.google.com/recaptcha/api/siteverify';
                const params = new URLSearchParams();
                params.append('secret', recaptchaSecret);
                params.append('response', captchaToken);
                const response = await fetch(verifyUrl, {
                    method: 'POST',
                    body: params,
                });
                const data = await response.json();
                console.log('reCAPTCHA verification result:', data);
                if (!data.success || (data.score !== undefined && data.score < 0.5)) {
                    console.warn(`reCAPTCHA failed. Success: ${data.success}, Score: ${data.score}`);
                    return {
                        statusCode: 400,
                        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                        body: JSON.stringify({ message: 'CAPTCHA verification failed', details: data['error-codes'] }),
                    };
                }
            }
            catch (err) {
                console.error('Error verifying reCAPTCHA:', err);
                return {
                    statusCode: 500,
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                    body: JSON.stringify({ message: 'Failed to verify CAPTCHA' }),
                };
            }
        }
        else {
            console.warn('RECAPTCHA_SECRET_KEY not set. Skipping server-side verification.');
        }
        const reportId = (0, crypto_1.randomUUID)();
        const createdAt = new Date().toISOString();
        const item = {
            reportId,
            createdAt,
            name: name || 'Anonymous',
            email: email || '',
            phone: phone || '',
            concernType,
            description: description || '',
            locationDescription: locationDescription || '',
            dateObserved: dateObserved || '',
            timeObserved: timeObserved || '',
            location, // { lat: number, lng: number }
            imageKeys: imageKeys || [], // string[]
            status: 'NEW',
            type: 'REPORT', // For GSI
        };
        // 1. Save to DynamoDB
        await docClient.send(new lib_dynamodb_1.PutCommand({
            TableName: TABLE_NAME,
            Item: item,
        }));
        // 2. Publish Event to EventBridge
        try {
            const eventDetail = {
                reportId,
                name: item.name,
                email: item.email,
                phone: item.phone,
                concernType,
                description,
                locationDescription,
                dateObserved,
                timeObserved,
                location, // { lat, lng }
                imageKeys: item.imageKeys,
            };
            await eventBridgeClient.send(new client_eventbridge_1.PutEventsCommand({
                Entries: [
                    {
                        Source: 'reports.api',
                        DetailType: 'ReportCreated',
                        Detail: JSON.stringify(eventDetail),
                        EventBusName: EVENT_BUS_NAME,
                    }
                ]
            }));
            console.log(`Event ReportCreated published for reportId: ${reportId}`);
        }
        catch (eventError) {
            console.error('Failed to publish event:', eventError);
            // Non-blocking, but logged.
        }
        return {
            statusCode: 201,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ message: 'Report created', reportId }),
        };
    }
    catch (error) {
        console.error('Error creating report:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ message: 'Internal Server Error' }),
        };
    }
};
exports.handler = handler;
