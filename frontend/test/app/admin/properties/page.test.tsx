import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import PropertiesPage from '../../../../app/admin/properties/page';
import { propertyTypesApi } from '../../../../lib/api/property-types';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: mockPush }),
}));

vi.mock('../../../../contexts/admin-auth-context', () => ({
    useAdminAuthContext: () => ({ isSuperAdmin: true, userGroups: ['SuperAdmin'], highestRole: 'SuperAdmin' }),
}));

describe('PropertiesPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render property type list with status column', async () => {
        const mockPropertyTypes = [
            {
                organizationId: 'GLOBAL',
                propertyTypeId: 'pt-1',
                name: 'Residential',
                description: 'Single-family residential properties',
                status: 'active' as const,
                createdAt: '2024-01-01T00:00:00Z',
            },
        ];
        vi.spyOn(propertyTypesApi, 'list').mockResolvedValue({ items: mockPropertyTypes });

        render(<PropertiesPage />);

        await waitFor(() => {
            expect(propertyTypesApi.list).toHaveBeenCalled();
        });

        await waitFor(() => {
            expect(screen.getByText('Residential')).toBeInTheDocument();
        });
        expect(screen.getByText('active')).toBeInTheDocument();
    });

    it('should render stat card with count', async () => {
        vi.spyOn(propertyTypesApi, 'list').mockResolvedValue({ items: [] });

        render(<PropertiesPage />);

        await waitFor(() => {
            expect(screen.getByText('Property Types')).toBeInTheDocument();
        });
    });

    it('should show empty state when no property types', async () => {
        vi.spyOn(propertyTypesApi, 'list').mockResolvedValue({ items: [] });

        render(<PropertiesPage />);

        await waitFor(() => {
            expect(screen.getByText('No property types found. Create one to get started.')).toBeInTheDocument();
        });
    });

    it('should show create button', async () => {
        vi.spyOn(propertyTypesApi, 'list').mockResolvedValue({ items: [] });

        render(<PropertiesPage />);

        expect(screen.getByText('New Property Type')).toBeInTheDocument();
    });

    it('should show error on load failure', async () => {
        vi.spyOn(propertyTypesApi, 'list').mockRejectedValue(new Error('fail'));

        render(<PropertiesPage />);

        await waitFor(() => {
            expect(screen.getByText('Failed to load property types.')).toBeInTheDocument();
        });
    });

    it('should show create dialog with Name and Description fields', async () => {
        vi.spyOn(propertyTypesApi, 'list').mockResolvedValue({ items: [] });

        render(<PropertiesPage />);

        fireEvent.click(screen.getByText('New Property Type'));

        await waitFor(() => {
            expect(screen.getByLabelText('Name')).toBeInTheDocument();
        });
        expect(screen.getByLabelText('Description')).toBeInTheDocument();
    });
});
