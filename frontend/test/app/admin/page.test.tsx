import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminDashboard from '../../../app/admin/page';
import { customersApi } from '../../../lib/api';

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

describe('AdminDashboard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render customer list', async () => {
        const mockCustomers = [
            { customerId: '1', firstName: 'John', lastName: 'Doe', email: 'john@test.com', status: 'active' },
        ];
        vi.spyOn(customersApi, 'list').mockResolvedValue({ items: mockCustomers });

        render(<AdminDashboard />);

        await waitFor(() => {
            expect(customersApi.list).toHaveBeenCalled();
        });

        await waitFor(() => {
            expect(screen.getByText('John Doe')).toBeInTheDocument();
        });
        expect(screen.getByText('john@test.com')).toBeInTheDocument();
    });

    it('should render dashboard stat cards', async () => {
        vi.spyOn(customersApi, 'list').mockResolvedValue({ items: [] });

        render(<AdminDashboard />);

        await waitFor(() => {
            expect(screen.getByText('Customers')).toBeInTheDocument();
        });

        expect(screen.getByText('Properties')).toBeInTheDocument();
        expect(screen.getByText('Active Services')).toBeInTheDocument();
        expect(screen.getByText('Revenue')).toBeInTheDocument();
    });

    it('should show empty state when no customers', async () => {
        vi.spyOn(customersApi, 'list').mockResolvedValue({ items: [] });

        render(<AdminDashboard />);

        await waitFor(() => {
            expect(screen.getByText('No customers found. Create one above!')).toBeInTheDocument();
        });
    });

    it('should redirect if not authorized', async () => {
        const { fetchAuthSession } = await import('aws-amplify/auth');
        vi.mocked(fetchAuthSession).mockResolvedValue({
            tokens: {
                accessToken: {
                    payload: {
                        'cognito:groups': ['User'], // Not Admin or Manager
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
