import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted for variables used in vi.mock factory
const { mockFetchAuthSession } = vi.hoisted(() => ({
    mockFetchAuthSession: vi.fn(),
}));

// Mock aws-amplify/auth
vi.mock('aws-amplify/auth', () => ({
    fetchAuthSession: mockFetchAuthSession,
}));

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { apiGet, apiPost, apiPut, apiDelete } from '../../lib/api';

describe('API client', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default: no auth session
        mockFetchAuthSession.mockRejectedValue(new Error('No session'));
    });

    describe('apiGet', () => {
        it('should fetch data successfully', async () => {
            const mockData = [{ customerId: '1', firstName: 'Test' }];
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(mockData),
            });

            const result = await apiGet('/customers');

            expect(result).toEqual(mockData);
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/customers'),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                    }),
                    cache: 'no-store',
                }),
            );
        });

        it('should throw on non-ok response', async () => {
            mockFetch.mockResolvedValue({ ok: false, status: 500 });

            await expect(apiGet('/customers')).rejects.toThrow('Failed to fetch /customers');
        });

        it('should include auth token when session exists', async () => {
            mockFetchAuthSession.mockResolvedValue({
                tokens: {
                    accessToken: { toString: () => 'test-token-123' },
                },
            });
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve([]),
            });

            await apiGet('/customers');

            expect(mockFetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        Authorization: 'Bearer test-token-123',
                    }),
                }),
            );
        });
    });

    describe('apiPost', () => {
        it('should create a resource successfully', async () => {
            const newCustomer = { customerId: '2', firstName: 'New' };
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(newCustomer),
            });

            const result = await apiPost('/customers', { firstName: 'New', lastName: 'Customer', email: 'test@test.com' });

            expect(result).toEqual(newCustomer);
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/customers'),
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({ firstName: 'New', lastName: 'Customer', email: 'test@test.com' }),
                }),
            );
        });

        it('should throw on non-ok response', async () => {
            mockFetch.mockResolvedValue({ ok: false, status: 400 });

            await expect(apiPost('/customers', {})).rejects.toThrow('Failed to create at /customers');
        });
    });

    describe('apiPut', () => {
        it('should update a resource successfully', async () => {
            const updated = { customerId: '1', firstName: 'Updated' };
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(updated),
            });

            const result = await apiPut('/customers/1', { firstName: 'Updated' });

            expect(result).toEqual(updated);
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/customers/1'),
                expect.objectContaining({ method: 'PUT' }),
            );
        });

        it('should throw on non-ok response', async () => {
            mockFetch.mockResolvedValue({ ok: false, status: 404 });

            await expect(apiPut('/customers/1', {})).rejects.toThrow('Failed to update at /customers/1');
        });
    });

    describe('apiDelete', () => {
        it('should delete a resource successfully', async () => {
            mockFetch.mockResolvedValue({ ok: true });

            await expect(apiDelete('/customers/1')).resolves.toBeUndefined();
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/customers/1'),
                expect.objectContaining({ method: 'DELETE' }),
            );
        });

        it('should throw on non-ok response', async () => {
            mockFetch.mockResolvedValue({ ok: false, status: 404 });

            await expect(apiDelete('/customers/bad-id')).rejects.toThrow('Failed to delete at /customers/bad-id');
        });
    });

    describe('getHeaders', () => {
        it('should not include auth header when session has no tokens', async () => {
            mockFetchAuthSession.mockResolvedValue({ tokens: null });
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve([]),
            });

            await apiGet('/customers');

            const callHeaders = mockFetch.mock.calls[0][1].headers;
            expect(callHeaders.Authorization).toBeUndefined();
        });

        it('should not include auth header when session throws', async () => {
            mockFetchAuthSession.mockRejectedValue(new Error('No session'));
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve([]),
            });

            await apiGet('/customers');

            const callHeaders = mockFetch.mock.calls[0][1].headers;
            expect(callHeaders.Authorization).toBeUndefined();
        });
    });
});
