import { NextResponse } from 'next/server';
import { db } from '@/db';
import { words } from '@/db/schema';
import { sql } from 'drizzle-orm';

export async function POST() {
    const result = await db.select().from(words).orderBy(sql`RANDOM()`).limit(1);
    const randomWord = result[0]?.text || "default";

    return NextResponse.json({ randomWord });
}
