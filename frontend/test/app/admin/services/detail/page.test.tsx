import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ServiceTypeDetailPage from '../../../../../app/admin/services/detail/page';

const mockPush = vi.fn();
const mockRouter = { push: mockPush };

vi.mock('next/navigation', () => ({
    useRouter: () => mockRouter,
    useSearchParams: () => ({
        get: (key: string) => key === 'id' ? 'st-123' : null,
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

vi.mock('../../../../../lib/api/service-types', () => ({
    serviceTypesApi: {
        get: (...args: unknown[]) => mockGet(...args),
        update: (...args: unknown[]) => mockUpdate(...args),
        list: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
    },
    SERVICE_UNIT_LABELS: {
        per_visit: 'Per Visit',
        per_hour: 'Per Hour',
        per_sqft: 'Per Sq Ft',
        per_linear_foot: 'Per Linear Foot',
        per_unit: 'Per Unit',
        per_window: 'Per Window',
    },
    SERVICE_FREQUENCY_LABELS: {
        weekly: 'Weekly',
        biweekly: 'Biweekly',
        monthly: 'Monthly',
        quarterly: 'Quarterly',
        biannual: 'Biannual',
        annually: 'Annually',
        one_time: 'One Time',
    },
}));

const mockServiceType = {
    organizationId: 'GLOBAL',
    serviceTypeId: 'st-123',
    name: 'Lawn Care',
    description: 'Regular lawn mowing',
    basePrice: 4999,
    unit: 'per_visit' as const,
    estimatedDuration: 60,
    frequency: 'monthly' as const,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
};

describe('ServiceTypeDetailPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render service type details with enriched fields', async () => {
        mockGet.mockResolvedValue(mockServiceType);

        render(<ServiceTypeDetailPage />);

        await waitFor(() => {
            expect(screen.getByText('Lawn Care')).toBeInTheDocument();
        });
        expect(screen.getByText('Service Type ID: st-123')).toBeInTheDocument();
        expect(screen.getByDisplayValue('49.99')).toBeInTheDocument();
        expect(screen.getByDisplayValue('60')).toBeInTheDocument();
    });

    it('should show loading state initially', () => {
        mockGet.mockReturnValue(new Promise(() => {}));

        render(<ServiceTypeDetailPage />);

        expect(document.querySelector('.animate-spin')).not.toBeNull();
    });

    it('should show not found when load fails', async () => {
        mockGet.mockRejectedValue(new Error('fail'));

        render(<ServiceTypeDetailPage />);

        await waitFor(() => {
            expect(screen.getByText('Service type not found.')).toBeInTheDocument();
        });
    });

    it('should render CategoryTagInput component', async () => {
        mockGet.mockResolvedValue(mockServiceType);

        render(<ServiceTypeDetailPage />);

        await waitFor(() => {
            expect(screen.getByTestId('category-tag-input')).toBeInTheDocument();
        });
        expect(screen.getByTestId('category-tag-input')).toHaveAttribute('data-entity-type', 'serviceType');
        expect(screen.getByTestId('category-tag-input')).toHaveAttribute('data-entity-id', 'st-123');
    });

    it('should render Categories card', async () => {
        mockGet.mockResolvedValue(mockServiceType);

        render(<ServiceTypeDetailPage />);

        await waitFor(() => {
            expect(screen.getByText('Categories')).toBeInTheDocument();
        });
        expect(screen.getByText('Assign categories to this service type.')).toBeInTheDocument();
    });

    it('should enable editing when Edit button is clicked', async () => {
        mockGet.mockResolvedValue(mockServiceType);

        render(<ServiceTypeDetailPage />);

        await waitFor(() => {
            expect(screen.getByText('Lawn Care')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Edit'));

        await waitFor(() => {
            expect(screen.getByText('Save')).toBeInTheDocument();
        });
        expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should save changes on form submit', async () => {
        mockGet.mockResolvedValue(mockServiceType);
        mockUpdate.mockResolvedValue({ ...mockServiceType, name: 'Premium Lawn Care' });

        render(<ServiceTypeDetailPage />);

        await waitFor(() => {
            expect(screen.getByText('Lawn Care')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Edit'));

        await waitFor(() => {
            expect(screen.getByText('Save')).toBeInTheDocument();
        });

        fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Premium Lawn Care' } });

        fireEvent.click(screen.getByText('Save'));

        await waitFor(() => {
            expect(mockUpdate).toHaveBeenCalledWith('st-123', expect.objectContaining({
                name: 'Premium Lawn Care',
            }));
        });
        await waitFor(() => {
            expect(screen.getByText('Service type updated.')).toBeInTheDocument();
        });
    });

    it('should cancel editing and revert form', async () => {
        mockGet.mockResolvedValue(mockServiceType);

        render(<ServiceTypeDetailPage />);

        await waitFor(() => {
            expect(screen.getByText('Lawn Care')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Edit'));

        await waitFor(() => {
            expect(screen.getByText('Cancel')).toBeInTheDocument();
        });

        fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Changed' } });

        fireEvent.click(screen.getByText('Cancel'));

        await waitFor(() => {
            expect(screen.getByDisplayValue('Lawn Care')).toBeInTheDocument();
        });
    });

    it('should show error on save failure', async () => {
        mockGet.mockResolvedValue(mockServiceType);
        mockUpdate.mockRejectedValue(new Error('fail'));

        render(<ServiceTypeDetailPage />);

        await waitFor(() => {
            expect(screen.getByText('Lawn Care')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Edit'));

        await waitFor(() => {
            expect(screen.getByText('Save')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Save'));

        await waitFor(() => {
            expect(screen.getByText('Failed to update service type.')).toBeInTheDocument();
        });
    });

    it('should allow editing description field', async () => {
        mockGet.mockResolvedValue(mockServiceType);

        render(<ServiceTypeDetailPage />);

        await waitFor(() => {
            expect(screen.getByText('Lawn Care')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Edit'));

        await waitFor(() => {
            expect(screen.getByText('Save')).toBeInTheDocument();
        });

        fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Updated mowing service' } });
        expect(screen.getByDisplayValue('Updated mowing service')).toBeInTheDocument();
    });

    it('should submit description in update payload', async () => {
        mockGet.mockResolvedValue(mockServiceType);
        mockUpdate.mockResolvedValue({ ...mockServiceType, description: 'New desc' });

        render(<ServiceTypeDetailPage />);

        await waitFor(() => {
            expect(screen.getByText('Lawn Care')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Edit'));

        await waitFor(() => {
            expect(screen.getByText('Save')).toBeInTheDocument();
        });

        fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'New desc' } });

        fireEvent.click(screen.getByText('Save'));

        await waitFor(() => {
            expect(mockUpdate).toHaveBeenCalledWith('st-123', expect.objectContaining({
                description: 'New desc',
            }));
        });
    });
});
