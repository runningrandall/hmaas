import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ServicesPage from '../../../../app/admin/services/page';
import { serviceTypesApi } from '../../../../lib/api/service-types';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: mockPush }),
}));

vi.mock('../../../../contexts/admin-auth-context', () => ({
    useAdminAuthContext: () => ({ isSuperAdmin: true, userGroups: ['SuperAdmin'], highestRole: 'SuperAdmin' }),
}));

describe('ServicesPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render service type list', async () => {
        const mockServiceTypes = [
            {
                organizationId: 'GLOBAL',
                serviceTypeId: 'st-1',
                name: 'Lawn Care',
                description: 'Regular lawn mowing and edging',
                createdAt: '2024-01-01T00:00:00Z',
            },
        ];
        vi.spyOn(serviceTypesApi, 'list').mockResolvedValue({ items: mockServiceTypes });

        render(<ServicesPage />);

        await waitFor(() => {
            expect(serviceTypesApi.list).toHaveBeenCalled();
        });

        await waitFor(() => {
            expect(screen.getByText('Lawn Care')).toBeInTheDocument();
        });
        expect(screen.getByText('Regular lawn mowing and edging')).toBeInTheDocument();
    });

    it('should render stat card with count', async () => {
        vi.spyOn(serviceTypesApi, 'list').mockResolvedValue({ items: [] });

        render(<ServicesPage />);

        await waitFor(() => {
            expect(screen.getByText('Service Types')).toBeInTheDocument();
        });
    });

    it('should show empty state when no service types', async () => {
        vi.spyOn(serviceTypesApi, 'list').mockResolvedValue({ items: [] });

        render(<ServicesPage />);

        await waitFor(() => {
            expect(screen.getByText('No service types found. Create one to get started.')).toBeInTheDocument();
        });
    });

    it('should show create button', async () => {
        vi.spyOn(serviceTypesApi, 'list').mockResolvedValue({ items: [] });

        render(<ServicesPage />);

        expect(screen.getByText('New Service Type')).toBeInTheDocument();
    });

    it('should show error on load failure', async () => {
        vi.spyOn(serviceTypesApi, 'list').mockRejectedValue(new Error('fail'));

        render(<ServicesPage />);

        await waitFor(() => {
            expect(screen.getByText('Failed to load service types.')).toBeInTheDocument();
        });
    });

    it('should show create dialog with Name and Description fields', async () => {
        vi.spyOn(serviceTypesApi, 'list').mockResolvedValue({ items: [] });

        render(<ServicesPage />);

        fireEvent.click(screen.getByText('New Service Type'));

        await waitFor(() => {
            expect(screen.getByLabelText('Name')).toBeInTheDocument();
        });
        expect(screen.getByLabelText('Description')).toBeInTheDocument();
    });
});
