'use client';

import { useAuthenticator } from '@aws-amplify/ui-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchAuthSession, fetchUserAttributes } from 'aws-amplify/auth';

export default function Profile() {
    const { authStatus, signOut } = useAuthenticator((context) => [context.authStatus]);
    const router = useRouter();
    const [groups, setGroups] = useState<string[]>([]);
    const [email, setEmail] = useState<string>('');
    const [username, setUsername] = useState<string>('');

    useEffect(() => {
        if (authStatus === 'unauthenticated') {
            router.push('/login');
        } else if (authStatus === 'authenticated') {
            fetchAuthSession().then(session => {
                const payload = session.tokens?.accessToken?.payload;
                const userGroups = (payload?.['cognito:groups'] || []) as string[];
                setGroups(Array.isArray(userGroups) ? userGroups : [userGroups]);
                setUsername(payload?.username as string || '');
            });

            fetchUserAttributes().then(attrs => {
                setEmail(attrs.email || '');
            }).catch(err => console.error(err));
        }
    }, [authStatus, router]);

    if (authStatus !== 'authenticated') {
        return <div className="p-10">Loading...</div>;
    }

    return (
        <div className="min-h-screen p-8 bg-gray-50 font-[family-name:var(--font-geist-sans)]">
            <main className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow">
                <h1 className="text-2xl font-bold mb-4">User Profile</h1>
                <p className="mb-2"><strong>Username:</strong> {username}</p>
                <p className="mb-2"><strong>Email:</strong> {email}</p>
                <p className="mb-4"><strong>Groups:</strong> {groups.join(', ') || 'None'}</p>

                <div className="flex gap-4 mb-6">
                    <Link href="/" className="text-blue-600 hover:scale-105 transition">
                        Home
                    </Link>
                    {groups.includes('Admin') || groups.includes('Manager') ? (
                        <Link href="/admin" className="text-blue-600 hover:scale-105 transition">
                            Admin Dashboard
                        </Link>
                    ) : null}
                </div>

                <button
                    onClick={signOut}
                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition"
                >
                    Sign Out
                </button>
            </main>
        </div>
    );
}
