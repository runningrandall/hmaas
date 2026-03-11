import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import PropertiesPage from '../../../../app/admin/properties/page';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: mockPush }),
}));

vi.mock('../../../../contexts/admin-auth-context', () => ({
    useAdminAuthContext: () => ({ isSuperAdmin: true, userGroups: ['SuperAdmin'], highestRole: 'SuperAdmin' }),
}));

const mockCustomersList = vi.fn();
const mockPropertyTypesList = vi.fn();
const mockPropertiesList = vi.fn();

vi.mock('../../../../lib/api/customers', () => ({
    customersApi: {
        list: (...args: unknown[]) => mockCustomersList(...args),
        get: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        getAccount: vi.fn(),
    },
}));

vi.mock('../../../../lib/api/property-types', () => ({
    propertyTypesApi: {
        list: (...args: unknown[]) => mockPropertyTypesList(...args),
        get: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    },
}));

vi.mock('../../../../lib/api/properties', () => ({
    propertiesApi: {
        listByCustomer: (...args: unknown[]) => mockPropertiesList(...args),
        get: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    },
    MEASUREMENT_FIELDS: [],
}));

const mockCustomers = [
    { customerId: 'c-1', firstName: 'John', lastName: 'Doe', email: 'john@example.com', status: 'active', createdAt: '2024-01-01T00:00:00Z' },
];

const mockPropertyTypes = [
    { organizationId: 'GLOBAL', propertyTypeId: 'pt-1', name: 'Residential', status: 'active', createdAt: '2024-01-01T00:00:00Z' },
];

describe('PropertiesPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockCustomersList.mockResolvedValue({ items: mockCustomers });
        mockPropertyTypesList.mockResolvedValue({ items: mockPropertyTypes });
        mockPropertiesList.mockResolvedValue({ items: [] });
    });

    it('should render page title', async () => {
        render(<PropertiesPage />);

        await waitFor(() => {
            expect(screen.getByText('Properties')).toBeInTheDocument();
        });
    });

    it('should load customers and property types on mount', async () => {
        render(<PropertiesPage />);

        await waitFor(() => {
            expect(mockCustomersList).toHaveBeenCalled();
        });
        expect(mockPropertyTypesList).toHaveBeenCalled();
    });

    it('should show customer selector', async () => {
        render(<PropertiesPage />);

        await waitFor(() => {
            expect(screen.getByText('Select Customer')).toBeInTheDocument();
        });
    });

    it('should load properties when customer is selected', async () => {
        const mockProperties = [
            {
                organizationId: 'org-1', propertyId: 'p-1', customerId: 'c-1', propertyTypeId: 'pt-1',
                name: 'Main House', address: '123 Main St', city: 'Springfield', state: 'IL', zip: '62701',
                createdAt: '2024-01-01T00:00:00Z',
            },
        ];
        mockPropertiesList.mockResolvedValue({ items: mockProperties });

        render(<PropertiesPage />);

        await waitFor(() => {
            expect(screen.getByText('Select a customer...')).toBeInTheDocument();
        });

        fireEvent.change(screen.getByRole('combobox') || screen.getByDisplayValue(''), { target: { value: 'c-1' } });

        await waitFor(() => {
            expect(mockPropertiesList).toHaveBeenCalledWith('c-1');
        });
    });

    it('should show empty state when no properties for customer', async () => {
        render(<PropertiesPage />);

        await waitFor(() => {
            expect(screen.getByText('Select a customer...')).toBeInTheDocument();
        });

        const select = screen.getAllByRole('combobox')[0];
        fireEvent.change(select, { target: { value: 'c-1' } });

        await waitFor(() => {
            expect(screen.getByText('No properties found for this customer. Create one to get started.')).toBeInTheDocument();
        });
    });

    it('should show error on load failure', async () => {
        mockCustomersList.mockRejectedValue(new Error('fail'));

        render(<PropertiesPage />);

        await waitFor(() => {
            expect(screen.getByText('Failed to load data.')).toBeInTheDocument();
        });
    });
});
