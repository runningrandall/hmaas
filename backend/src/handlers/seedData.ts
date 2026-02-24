import { CloudFormationCustomResourceEvent, Context } from 'aws-lambda';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';

const dynamodb = new DynamoDBClient({});
const TABLE_NAME = process.env.TABLE_NAME!;

const SEED_DATA = [
    // Property Types
    {
        pk: { S: '$versa#propertytypeid_residential' },
        sk: { S: '$propertyType_1' },
        propertyTypeId: { S: 'residential' },
        name: { S: 'Residential' },
        description: { S: 'Single-family residential property' },
        createdAt: { N: String(Date.now()) },
        __edb_e__: { S: 'propertyType' },
        __edb_v__: { S: '1' },
    },
    {
        pk: { S: '$versa#propertytypeid_commercial' },
        sk: { S: '$propertyType_1' },
        propertyTypeId: { S: 'commercial' },
        name: { S: 'Commercial' },
        description: { S: 'Commercial business property' },
        createdAt: { N: String(Date.now()) },
        __edb_e__: { S: 'propertyType' },
        __edb_v__: { S: '1' },
    },
    // Service Types
    ...['Lawn Care', 'Pest Control', 'Fertilizer', 'Window Cleaning', 'Sprinkler', 'Winterizing', 'Snow Removal', 'Gutter Cleaning', 'Power Washing', 'Tree Trimming'].map(name => ({
        pk: { S: `$versa#servicetypeid_${name.toLowerCase().replace(/\s+/g, '_')}` },
        sk: { S: '$serviceType_1' },
        serviceTypeId: { S: name.toLowerCase().replace(/\s+/g, '_') },
        name: { S: name },
        description: { S: `Professional ${name.toLowerCase()} services` },
        category: { S: name.includes('Snow') || name.includes('Winter') ? 'Seasonal' : 'Regular' },
        createdAt: { N: String(Date.now()) },
        __edb_e__: { S: 'serviceType' },
        __edb_v__: { S: '1' },
    })),
    // Cost Types
    ...['One-Time', 'Recurring Monthly', 'Recurring Quarterly', 'Seasonal', 'Per-Visit'].map(name => ({
        pk: { S: `$versa#costtypeid_${name.toLowerCase().replace(/[\s-]+/g, '_')}` },
        sk: { S: '$costType_1' },
        costTypeId: { S: name.toLowerCase().replace(/[\s-]+/g, '_') },
        name: { S: name },
        description: { S: `${name} billing frequency` },
        createdAt: { N: String(Date.now()) },
        __edb_e__: { S: 'costType' },
        __edb_v__: { S: '1' },
    })),
];

export const handler = async (event: CloudFormationCustomResourceEvent, context: Context) => {
    console.log('Seed handler invoked', JSON.stringify(event));

    const responseUrl = event.ResponseURL;
    const responseBody: Record<string, any> = {
        Status: 'SUCCESS',
        Reason: `See CloudWatch Log Stream: ${context.logStreamName}`,
        PhysicalResourceId: context.logStreamName,
        StackId: event.StackId,
        RequestId: event.RequestId,
        LogicalResourceId: event.LogicalResourceId,
        Data: {},
    };

    try {
        if (event.RequestType === 'Create' || event.RequestType === 'Update') {
            console.log(`Seeding ${SEED_DATA.length} items into ${TABLE_NAME}`);

            for (const item of SEED_DATA) {
                await dynamodb.send(new PutItemCommand({
                    TableName: TABLE_NAME,
                    Item: item,
                    ConditionExpression: 'attribute_not_exists(pk)',
                })).catch((err) => {
                    if (err.name === 'ConditionalCheckFailedException') {
                        console.log(`Item ${item.pk.S} already exists, skipping.`);
                    } else {
                        throw err;
                    }
                });
            }

            responseBody.Data = { SeededCount: SEED_DATA.length };
            console.log('Seeding complete.');
        }

        if (event.RequestType === 'Delete') {
            console.log('Delete request — no action needed for seed data.');
        }
    } catch (error: any) {
        console.error('Seed handler error:', error);
        responseBody.Status = 'FAILED';
        responseBody.Reason = error.message;
    }

    const response = await fetch(responseUrl, {
        method: 'PUT',
        body: JSON.stringify(responseBody),
        headers: { 'Content-Type': '' },
    });

    console.log(`CloudFormation response status: ${response.status}`);
    return;
};
