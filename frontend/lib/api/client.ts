import { fetchAuthSession } from 'aws-amplify/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

async function getHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    try {
        const session = await fetchAuthSession();
        const token = session.tokens?.accessToken?.toString();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
    } catch (e) {
        console.debug('No auth session found', e);
    }

    return headers;
}

export async function apiGet<T>(path: string): Promise<T> {
    const headers = await getHeaders();
    const res = await fetch(`${API_URL}${path}`, { headers, cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed to fetch ${path}`);
    return res.json();
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
    const headers = await getHeaders();
    const res = await fetch(`${API_URL}${path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Failed to create at ${path}`);
    return res.json();
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
    const headers = await getHeaders();
    const res = await fetch(`${API_URL}${path}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Failed to update at ${path}`);
    return res.json();
}

export async function apiDelete(path: string): Promise<void> {
    const headers = await getHeaders();
    const res = await fetch(`${API_URL}${path}`, {
        method: 'DELETE',
        headers,
    });
    if (!res.ok) throw new Error(`Failed to delete at ${path}`);
}

export { API_URL };
