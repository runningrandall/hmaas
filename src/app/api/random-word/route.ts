import { NextResponse } from 'next/server';

const words = [
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

export async function POST() {
    const randomWord = words[Math.floor(Math.random() * words.length)];
    return NextResponse.json({ randomWord });
}
