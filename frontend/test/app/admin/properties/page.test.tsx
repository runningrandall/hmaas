import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import PropertiesPage from '../../../../app/admin/properties/page';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: mockPush }),
    useSearchParams: () => new URLSearchParams(),
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
    { customerId: 'c-1', firstName: 'John', lastName: 'Doe', email: 'john@example.com', phone: '303-555-1234', status: 'active', createdAt: '2024-01-01T00:00:00Z' },
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

    it('should load property types on mount', async () => {
        render(<PropertiesPage />);

        await waitFor(() => {
            expect(mockPropertyTypesList).toHaveBeenCalled();
        });
    });

    it('should show customer search box', async () => {
        render(<PropertiesPage />);

        await waitFor(() => {
            expect(screen.getByPlaceholderText('Search customers by name, email, or phone...')).toBeInTheDocument();
        });
        expect(screen.getByText('Find Customer')).toBeInTheDocument();
    });

    it('should search customers on text input', async () => {
        render(<PropertiesPage />);

        await waitFor(() => {
            expect(screen.getByPlaceholderText('Search customers by name, email, or phone...')).toBeInTheDocument();
        });

        const input = screen.getByPlaceholderText('Search customers by name, email, or phone...');
        fireEvent.change(input, { target: { value: 'John' } });

        // Wait for debounced search to fire
        await waitFor(() => {
            expect(mockCustomersList).toHaveBeenCalledWith('John');
        });
    });

    it('should show search results and select customer', async () => {
        render(<PropertiesPage />);

        await waitFor(() => {
            expect(screen.getByPlaceholderText('Search customers by name, email, or phone...')).toBeInTheDocument();
        });

        const input = screen.getByPlaceholderText('Search customers by name, email, or phone...');
        fireEvent.change(input, { target: { value: 'John' } });

        await waitFor(() => {
            expect(screen.getByText('John Doe')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('John Doe'));

        await waitFor(() => {
            expect(mockPropertiesList).toHaveBeenCalledWith('c-1');
        });
    });

    it('should show error on load failure', async () => {
        mockPropertyTypesList.mockRejectedValue(new Error('fail'));

        render(<PropertiesPage />);

        await waitFor(() => {
            expect(screen.getByText('Failed to load data.')).toBeInTheDocument();
        });
    });
});
