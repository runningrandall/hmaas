import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AdminLayout from '../../../app/admin/layout';

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: vi.fn(),
    }),
    usePathname: () => '/admin',
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

// Mock ResizeObserver which is used by Sidebar
global.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
};

describe('AdminLayout', () => {
    it('should render sidebar always visible with child content', async () => {
        render(
            <AdminLayout>
                <div>Child Content</div>
            </AdminLayout>
        );

        await waitFor(() => {
            expect(screen.getByText('Child Content')).toBeInTheDocument();
        });

        expect(screen.getByText('Versa Admin')).toBeInTheDocument();
    });
});
