'use client';

import { useAuthenticator } from '@aws-amplify/ui-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listItems, createItem, deleteItem } from '../../lib/api';
import { fetchAuthSession } from 'aws-amplify/auth';

export default function AdminDashboard() {
    const { authStatus } = useAuthenticator((context) => [context.authStatus]);
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [items, setItems] = useState<any[]>([]);
    const [newItemName, setNewItemName] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (authStatus === 'unauthenticated') {
            router.push('/login');
        } else if (authStatus === 'authenticated') {
            fetchAuthSession().then(session => {
                const payload = session.tokens?.accessToken?.payload;
                const userGroups = (payload?.['cognito:groups'] || []) as string[];

                if (userGroups.includes('Admin') || userGroups.includes('Manager')) {
                    setIsAuthorized(true);
                    loadItems();
                } else {
                    router.push('/profile'); // Not authorized
                }
            });
        }
    }, [authStatus, router]);

    const loadItems = async () => {
        try {
            const data = await listItems();
            setItems(data);
        } catch (err: any) {
            console.error(err);
            setError('Failed to load items. You might not have permission.');
        }
    };

    const handleCreate = async () => {
        try {
            await createItem(newItemName, 'Created via Admin Dashboard');
            setNewItemName('');
            loadItems();
        } catch (err) {
            setError('Failed to create item');
        }
    };

    if (authStatus !== 'authenticated' || !isAuthorized) {
        return <div className="p-10">Checking authorization...</div>;
    }

    return (
        <div className="min-h-screen p-8 bg-gray-50 font-[family-name:var(--font-geist-sans)]">
            <main className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                    <Link href="/profile" className="text-blue-600">Back to Profile</Link>
                </div>

                {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}

                <div className="mb-8">
                    <h2 className="text-xl font-semibold mb-2">Manage Items</h2>
                    <div className="flex gap-2 mb-4">
                        <input
                            type="text"
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                            placeholder="New Item Name"
                            className="border p-2 rounded flex-grow"
                        />
                        <button
                            onClick={handleCreate}
                            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                        >
                            Add Item
                        </button>
                    </div>

                    <ul className="divide-y">
                        {items.map((item) => (
                            <li key={item.pk + item.sk} className="py-3 flex justify-between items-center">
                                <span>{item.name}</span>
                                <button
                                    onClick={async () => {
                                        await deleteItem(item.itemId);
                                        loadItems();
                                    }}
                                    className="text-red-600 hover:underline"
                                >
                                    Delete
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            </main>
        </div>
    );
}
