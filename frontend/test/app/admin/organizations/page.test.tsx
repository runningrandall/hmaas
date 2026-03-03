import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import OrganizationsPage from '../../../../app/admin/organizations/page';
import { organizationsApi } from '../../../../lib/api/organizations';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: mockPush }),
}));

vi.mock('../../../../contexts/admin-auth-context', () => ({
    useAdminAuthContext: () => ({ isSuperAdmin: true, userGroups: ['SuperAdmin'], highestRole: 'SuperAdmin' }),
}));

describe('OrganizationsPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render organization list', async () => {
        const mockOrgs = [
            {
                organizationId: 'org-1',
                name: 'Acme Corp',
                slug: 'acme',
                status: 'active',
                ownerUserId: 'user-1',
                billingEmail: 'billing@acme.com',
                createdAt: '2024-01-01T00:00:00Z',
            },
        ];
        vi.spyOn(organizationsApi, 'list').mockResolvedValue({ items: mockOrgs });

        render(<OrganizationsPage />);

        await waitFor(() => {
            expect(organizationsApi.list).toHaveBeenCalled();
        });

        await waitFor(() => {
            expect(screen.getByText('Acme Corp')).toBeInTheDocument();
        });
        expect(screen.getByText('acme')).toBeInTheDocument();
        expect(screen.getByText('active')).toBeInTheDocument();
        expect(screen.getByText('billing@acme.com')).toBeInTheDocument();
    });

    it('should render stat card with org count', async () => {
        vi.spyOn(organizationsApi, 'list').mockResolvedValue({ items: [] });

        render(<OrganizationsPage />);

        await waitFor(() => {
            expect(screen.getByText('Organizations')).toBeInTheDocument();
        });
    });

    it('should show empty state when no organizations', async () => {
        vi.spyOn(organizationsApi, 'list').mockResolvedValue({ items: [] });

        render(<OrganizationsPage />);

        await waitFor(() => {
            expect(screen.getByText('No organizations found. Create one to get started.')).toBeInTheDocument();
        });
    });

    it('should show create button', async () => {
        vi.spyOn(organizationsApi, 'list').mockResolvedValue({ items: [] });

        render(<OrganizationsPage />);

        expect(screen.getByText('New Organization')).toBeInTheDocument();
    });

    it('should show error on load failure', async () => {
        vi.spyOn(organizationsApi, 'list').mockRejectedValue(new Error('fail'));

        render(<OrganizationsPage />);

        await waitFor(() => {
            expect(screen.getByText('Failed to load organizations.')).toBeInTheDocument();
        });
    });
});
