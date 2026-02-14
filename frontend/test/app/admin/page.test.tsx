import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminDashboard from '../../../app/admin/page';
import * as api from '../../../lib/api';

// Mocks
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: mockPush,
    }),
}));

vi.mock('@aws-amplify/ui-react', () => ({
    useAuthenticator: () => ({
        authStatus: 'authenticated',
    }),
}));

vi.mock('aws-amplify/auth', () => ({
    fetchAuthSession: vi.fn().mockResolvedValue({
        tokens: {
            accessToken: {
                payload: {
                    'cognito:groups': ['Admin'],
                },
            },
        },
    }),
}));

vi.mock('use-debounce', () => ({
    useDebounce: <T,>(val: T) => [val],
}));

describe('AdminDashboard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render reports list', async () => {
        const mockReports = [
            { reportId: '1', createdAt: '2024-01-01T10:00:00Z', concernType: 'Safety', description: 'Test', location: { lat: 0, lng: 0 }, imageKeys: [] },
        ];
        vi.spyOn(api, 'listReports').mockResolvedValue({ items: mockReports, nextToken: null });

        render(<AdminDashboard />);

        // Wait for authorization and data load
        await waitFor(() => {
            expect(api.listReports).toHaveBeenCalled();
        });

        await waitFor(() => {
            expect(screen.getByText('Safety')).toBeInTheDocument();
        });
        expect(screen.getByText('Test')).toBeInTheDocument();
    });

    it('should handle pagination', async () => {
        vi.spyOn(api, 'listReports')
            .mockResolvedValueOnce({ items: [{ reportId: '1', createdAt: '2024-01-01T10:00:00Z', concernType: 'Page1', description: 'Desc1', location: { lat: 0, lng: 0 }, imageKeys: [] }], nextToken: 'token-a' })
            .mockResolvedValueOnce({ items: [{ reportId: '2', createdAt: '2024-01-01T10:00:00Z', concernType: 'Page2', description: 'Desc2', location: { lat: 0, lng: 0 }, imageKeys: [] }], nextToken: null });

        render(<AdminDashboard />);

        await waitFor(() => {
            expect(screen.getByText('Page1')).toBeInTheDocument();
        });

        const nextBtn = screen.getByText('Next');
        expect(nextBtn).toBeEnabled();
        fireEvent.click(nextBtn);

        await waitFor(() => {
            expect(screen.getByText('Page2')).toBeInTheDocument();
        });
    });

    it('should handle search', async () => {
        vi.spyOn(api, 'listReports').mockResolvedValue({ items: [], nextToken: null });

        render(<AdminDashboard />);

        await waitFor(() => {
            expect(screen.getByPlaceholderText('Search reports...')).toBeInTheDocument();
        });

        const searchInput = screen.getByPlaceholderText('Search reports...');
        fireEvent.change(searchInput, { target: { value: 'query' } });

        await waitFor(() => {
            expect(api.listReports).toHaveBeenCalledWith(10, null, 'query');
        });
    });

    it('should redirect if not authorized', async () => {
        const { fetchAuthSession } = await import('aws-amplify/auth');
        vi.mocked(fetchAuthSession).mockResolvedValue({
            tokens: {
                accessToken: {
                    payload: {
                        'cognito:groups': ['User'], // Not Admin
                    },
                },
            },
        });

        render(<AdminDashboard />);

        await waitFor(() => {
            expect(mockPush).toHaveBeenCalledWith('/profile');
        });
    });
});
