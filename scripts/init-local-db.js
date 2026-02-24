const { DynamoDBClient, CreateTableCommand, DescribeTableCommand } = require("@aws-sdk/client-dynamodb");

const TABLE_NAME = "versa-table";
const ENDPOINT = "http://localhost:8000";
const REGION = "us-east-1";

const client = new DynamoDBClient({
    endpoint: ENDPOINT,
    region: REGION,
    credentials: {
        accessKeyId: "test",
        secretAccessKey: "test",
    },
});

const createTable = async () => {
    try {
        // Check if table exists
        await client.send(new DescribeTableCommand({ TableName: TABLE_NAME }));
        console.log(`Table ${TABLE_NAME} already exists.`);
    } catch (e) {
        if (e.name === "ResourceNotFoundException") {
            // Table doesn't exist, create it
            console.log(`Creating table ${TABLE_NAME}...`);
            try {
                await client.send(new CreateTableCommand({
                    TableName: TABLE_NAME,
                    AttributeDefinitions: [
                        { AttributeName: "pk", AttributeType: "S" },
                        { AttributeName: "sk", AttributeType: "S" },
                        { AttributeName: "gsi1pk", AttributeType: "S" },
                        { AttributeName: "gsi1sk", AttributeType: "S" },
                        { AttributeName: "gsi2pk", AttributeType: "S" },
                        { AttributeName: "gsi2sk", AttributeType: "S" },
                    ],
                    KeySchema: [
                        { AttributeName: "pk", KeyType: "HASH" },
                        { AttributeName: "sk", KeyType: "RANGE" },
                    ],
                    GlobalSecondaryIndexes: [
                        {
                            IndexName: "gsi1",
                            KeySchema: [
                                { AttributeName: "gsi1pk", KeyType: "HASH" },
                                { AttributeName: "gsi1sk", KeyType: "RANGE" },
                            ],
                            Projection: { ProjectionType: "ALL" },
                        },
                        {
                            IndexName: "gsi2",
                            KeySchema: [
                                { AttributeName: "gsi2pk", KeyType: "HASH" },
                                { AttributeName: "gsi2sk", KeyType: "RANGE" },
                            ],
                            Projection: { ProjectionType: "ALL" },
                        },
                    ],
                    BillingMode: "PAY_PER_REQUEST",
                }));
                console.log(`Table ${TABLE_NAME} created successfully.`);
            } catch (createError) {
                console.error("Error creating table:", createError);
                process.exit(1);
            }
        } else {
            console.error("Error checking table existence:", e);
            process.exit(1);
        }
    }
};

createTable();
