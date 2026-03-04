import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import PlansPage from '../../../../app/admin/plans/page';
import { plansApi } from '../../../../lib/api/plans';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: mockPush }),
}));

vi.mock('../../../../contexts/admin-auth-context', () => ({
    useAdminAuthContext: () => ({ isSuperAdmin: true, userGroups: ['SuperAdmin'], highestRole: 'SuperAdmin' }),
}));

describe('PlansPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render plan list', async () => {
        const mockPlans = [
            {
                organizationId: 'org-1',
                planId: 'plan-1',
                name: 'Basic Plan',
                monthlyPrice: 2999,
                annualPrice: 29999,
                status: 'active' as const,
                createdAt: '2024-01-01T00:00:00Z',
            },
        ];
        vi.spyOn(plansApi, 'list').mockResolvedValue({ items: mockPlans });

        render(<PlansPage />);

        await waitFor(() => {
            expect(plansApi.list).toHaveBeenCalled();
        });

        await waitFor(() => {
            expect(screen.getByText('Basic Plan')).toBeInTheDocument();
        });
        expect(screen.getByText('$29.99')).toBeInTheDocument();
        expect(screen.getByText('$299.99')).toBeInTheDocument();
        expect(screen.getByText('active')).toBeInTheDocument();
    });

    it('should render stat card with count', async () => {
        vi.spyOn(plansApi, 'list').mockResolvedValue({ items: [] });

        render(<PlansPage />);

        await waitFor(() => {
            expect(screen.getByText('Total Plans')).toBeInTheDocument();
        });
    });

    it('should show empty state when no plans', async () => {
        vi.spyOn(plansApi, 'list').mockResolvedValue({ items: [] });

        render(<PlansPage />);

        await waitFor(() => {
            expect(screen.getByText('No plans found. Create one to get started.')).toBeInTheDocument();
        });
    });

    it('should show create button', async () => {
        vi.spyOn(plansApi, 'list').mockResolvedValue({ items: [] });

        render(<PlansPage />);

        expect(screen.getByText('New Plan')).toBeInTheDocument();
    });

    it('should show error on load failure', async () => {
        vi.spyOn(plansApi, 'list').mockRejectedValue(new Error('fail'));

        render(<PlansPage />);

        await waitFor(() => {
            expect(screen.getByText('Failed to load plans.')).toBeInTheDocument();
        });
    });

    it('should show create dialog with form fields', async () => {
        vi.spyOn(plansApi, 'list').mockResolvedValue({ items: [] });

        render(<PlansPage />);

        fireEvent.click(screen.getByText('New Plan'));

        await waitFor(() => {
            expect(screen.getByLabelText('Name')).toBeInTheDocument();
        });
        expect(screen.getByLabelText('Description')).toBeInTheDocument();
        expect(screen.getByLabelText('Monthly Price ($)')).toBeInTheDocument();
        expect(screen.getByLabelText('Annual Price ($)')).toBeInTheDocument();
    });
});
