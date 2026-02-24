const { DynamoDBClient, BatchWriteItemCommand } = require("@aws-sdk/client-dynamodb");
const fs = require("fs");
const path = require("path");

const TABLE_NAME = "versa-table";
const ENDPOINT = "http://localhost:8000";
const REGION = "us-east-1";
const SEED_FILE = path.join(__dirname, "seed-data.json");

const client = new DynamoDBClient({
    endpoint: ENDPOINT,
    region: REGION,
    credentials: {
        accessKeyId: "test",
        secretAccessKey: "test",
    },
});

const seedDatabase = async () => {
    try {
        if (!fs.existsSync(SEED_FILE)) {
            console.error(`Seed file not found: ${SEED_FILE}`);
            process.exit(1);
        }

        const seedData = JSON.parse(fs.readFileSync(SEED_FILE, "utf8"));

        // Check if the seed data structure matches what we expect (keys are table names)
        // Adjust based on current seed-data.json structure which has "serverless-template-table" as key
        const items = seedData[TABLE_NAME] || seedData["versa-table"];

        if (!items || !Array.isArray(items)) {
            console.log("No items found for table in seed file.");
            return;
        }

        console.log(`Seeding ${items.length} items into ${TABLE_NAME}...`);

        // DynamoDB BatchWriteItem is limited to 25 items per request
        const chunkSize = 25;
        for (let i = 0; i < items.length; i += chunkSize) {
            const chunk = items.slice(i, i + chunkSize);

            const params = {
                RequestItems: {
                    [TABLE_NAME]: chunk
                }
            };

            await client.send(new BatchWriteItemCommand(params));
            console.log(`Batch ${Math.floor(i / chunkSize) + 1} written.`);
        }

        console.log("Database seeded successfully.");
    } catch (e) {
        console.error("Error seeding database:", e);
        process.exit(1);
    }
};

seedDatabase();
