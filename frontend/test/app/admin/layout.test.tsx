import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AdminLayout from '../../../app/admin/layout';

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: vi.fn(),
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

// Mock ResizeObserver which is used by Sidebar
global.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
};

describe('AdminLayout', () => {
    it('should render sidebar as collapsed by default', async () => {
        render(
            <AdminLayout>
                <div>Child Content</div>
            </AdminLayout>
        );

        await waitFor(() => {
            const sidebar = document.querySelector('div[data-state="collapsed"]');
            expect(sidebar).toBeInTheDocument();
        });

        expect(screen.getByText('Child Content')).toBeInTheDocument();
    });
});
