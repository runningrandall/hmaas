import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const words = pgTable('words', {
    id: serial('id').primaryKey(),
    text: text('text').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});
