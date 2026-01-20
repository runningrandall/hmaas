import { db } from './index';
import { words } from './schema';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const seedWords = [
    'apple',
    'banana',
    'cherry',
    'date',
    'elderberry',
    'fig',
    'grape',
    'honeydew',
    'kiwi',
    'lemon',
    'mango',
    'nectarine',
    'orange',
    'papaya',
    'quince',
    'raspberry',
    'strawberry',
    'tangerine',
    'ugli',
    'watermelon'
];

async function main() {
    console.log('Seeding database...');
    await db.insert(words).values(seedWords.map(text => ({ text })));
    console.log('Database seeded!');
    process.exit(0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
