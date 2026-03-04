import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import PlanDetailPage from '../../../../../app/admin/plans/detail/page';

const mockPush = vi.fn();
const mockRouter = { push: mockPush };

vi.mock('next/navigation', () => ({
    useRouter: () => mockRouter,
    useSearchParams: () => ({
        get: (key: string) => key === 'id' ? 'plan-123' : null,
    }),
}));

vi.mock('../../../../../contexts/admin-auth-context', () => ({
    useAdminAuthContext: () => ({ isSuperAdmin: true, userGroups: ['SuperAdmin'], highestRole: 'SuperAdmin' }),
}));

vi.mock('../../../../../components/CategoryTagInput', () => ({
    default: ({ entityType, entityId }: { entityType: string; entityId: string }) => (
        <div data-testid="category-tag-input" data-entity-type={entityType} data-entity-id={entityId}>
            CategoryTagInput Mock
        </div>
    ),
}));

const mockGet = vi.fn();
const mockUpdate = vi.fn();

vi.mock('../../../../../lib/api/plans', () => ({
    plansApi: {
        get: (...args: unknown[]) => mockGet(...args),
        update: (...args: unknown[]) => mockUpdate(...args),
        list: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
    },
}));

const mockPlan = {
    organizationId: 'org-1',
    planId: 'plan-123',
    name: 'Basic Plan',
    description: 'A basic plan',
    monthlyPrice: 2999,
    annualPrice: 29999,
    status: 'active' as const,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
};

describe('PlanDetailPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render plan details', async () => {
        mockGet.mockResolvedValue(mockPlan);

        render(<PlanDetailPage />);

        await waitFor(() => {
            expect(screen.getByText('Basic Plan')).toBeInTheDocument();
        });
        expect(screen.getByText('Plan ID: plan-123')).toBeInTheDocument();
        expect(screen.getByText('active')).toBeInTheDocument();
    });

    it('should show loading state initially', () => {
        mockGet.mockReturnValue(new Promise(() => {}));

        render(<PlanDetailPage />);

        expect(document.querySelector('.animate-spin')).not.toBeNull();
    });

    it('should show not found when load fails', async () => {
        mockGet.mockRejectedValue(new Error('fail'));

        render(<PlanDetailPage />);

        await waitFor(() => {
            expect(screen.getByText('Plan not found.')).toBeInTheDocument();
        });
    });

    it('should render CategoryTagInput component with plan entity type', async () => {
        mockGet.mockResolvedValue(mockPlan);

        render(<PlanDetailPage />);

        await waitFor(() => {
            expect(screen.getByTestId('category-tag-input')).toBeInTheDocument();
        });
        expect(screen.getByTestId('category-tag-input')).toHaveAttribute('data-entity-type', 'plan');
        expect(screen.getByTestId('category-tag-input')).toHaveAttribute('data-entity-id', 'plan-123');
    });

    it('should render Categories card', async () => {
        mockGet.mockResolvedValue(mockPlan);

        render(<PlanDetailPage />);

        await waitFor(() => {
            expect(screen.getByText('Categories')).toBeInTheDocument();
        });
        expect(screen.getByText('Assign categories to this plan.')).toBeInTheDocument();
    });

    it('should enable editing when Edit button is clicked', async () => {
        mockGet.mockResolvedValue(mockPlan);

        render(<PlanDetailPage />);

        await waitFor(() => {
            expect(screen.getByText('Basic Plan')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Edit'));

        await waitFor(() => {
            expect(screen.getByText('Save')).toBeInTheDocument();
        });
        expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should save changes on form submit', async () => {
        mockGet.mockResolvedValue(mockPlan);
        mockUpdate.mockResolvedValue({ ...mockPlan, name: 'Premium Plan' });

        render(<PlanDetailPage />);

        await waitFor(() => {
            expect(screen.getByText('Basic Plan')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Edit'));

        await waitFor(() => {
            expect(screen.getByText('Save')).toBeInTheDocument();
        });

        fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Premium Plan' } });

        fireEvent.click(screen.getByText('Save'));

        await waitFor(() => {
            expect(mockUpdate).toHaveBeenCalledWith('plan-123', expect.objectContaining({
                name: 'Premium Plan',
            }));
        });
        await waitFor(() => {
            expect(screen.getByText('Plan updated.')).toBeInTheDocument();
        });
    });

    it('should cancel editing and revert form', async () => {
        mockGet.mockResolvedValue(mockPlan);

        render(<PlanDetailPage />);

        await waitFor(() => {
            expect(screen.getByText('Basic Plan')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Edit'));

        await waitFor(() => {
            expect(screen.getByText('Cancel')).toBeInTheDocument();
        });

        fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Changed' } });

        fireEvent.click(screen.getByText('Cancel'));

        await waitFor(() => {
            expect(screen.getByDisplayValue('Basic Plan')).toBeInTheDocument();
        });
    });

    it('should show error on save failure', async () => {
        mockGet.mockResolvedValue(mockPlan);
        mockUpdate.mockRejectedValue(new Error('fail'));

        render(<PlanDetailPage />);

        await waitFor(() => {
            expect(screen.getByText('Basic Plan')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Edit'));

        await waitFor(() => {
            expect(screen.getByText('Save')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Save'));

        await waitFor(() => {
            expect(screen.getByText('Failed to update plan.')).toBeInTheDocument();
        });
    });

    it('should display prices converted from cents', async () => {
        mockGet.mockResolvedValue(mockPlan);

        render(<PlanDetailPage />);

        await waitFor(() => {
            expect(screen.getByDisplayValue('29.99')).toBeInTheDocument();
        });
        expect(screen.getByDisplayValue('299.99')).toBeInTheDocument();
    });

    it('should show "Plan not found" when plan is null after load', async () => {
        mockGet.mockResolvedValue(null);

        render(<PlanDetailPage />);

        await waitFor(() => {
            expect(screen.getByText('Plan not found.')).toBeInTheDocument();
        });
    });

    it('should allow editing all form fields', async () => {
        mockGet.mockResolvedValue(mockPlan);

        render(<PlanDetailPage />);

        await waitFor(() => {
            expect(screen.getByText('Basic Plan')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Edit'));

        await waitFor(() => {
            expect(screen.getByText('Save')).toBeInTheDocument();
        });

        fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Updated description' } });
        expect(screen.getByDisplayValue('Updated description')).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText('Monthly Price ($)'), { target: { value: '49.99' } });
        expect(screen.getByDisplayValue('49.99')).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText('Annual Price ($)'), { target: { value: '499.99' } });
        expect(screen.getByDisplayValue('499.99')).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'inactive' } });
        expect((screen.getByLabelText('Status') as HTMLSelectElement).value).toBe('inactive');
    });

    it('should submit converted price values in cents', async () => {
        mockGet.mockResolvedValue(mockPlan);
        mockUpdate.mockResolvedValue(mockPlan);

        render(<PlanDetailPage />);

        await waitFor(() => {
            expect(screen.getByText('Basic Plan')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Edit'));

        await waitFor(() => {
            expect(screen.getByText('Save')).toBeInTheDocument();
        });

        fireEvent.change(screen.getByLabelText('Monthly Price ($)'), { target: { value: '49.99' } });
        fireEvent.change(screen.getByLabelText('Annual Price ($)'), { target: { value: '499.99' } });

        fireEvent.click(screen.getByText('Save'));

        await waitFor(() => {
            expect(mockUpdate).toHaveBeenCalledWith('plan-123', expect.objectContaining({
                monthlyPrice: 4999,
                annualPrice: 49999,
            }));
        });
    });
});
