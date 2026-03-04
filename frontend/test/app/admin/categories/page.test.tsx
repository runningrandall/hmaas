import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import CategoriesPage from '../../../../app/admin/categories/page';
import { categoriesApi } from '../../../../lib/api/categories';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: mockPush }),
}));

vi.mock('../../../../contexts/admin-auth-context', () => ({
    useAdminAuthContext: () => ({ isSuperAdmin: true, userGroups: ['SuperAdmin'], highestRole: 'SuperAdmin' }),
}));

describe('CategoriesPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render category list', async () => {
        const mockCategories = [
            {
                organizationId: 'GLOBAL',
                categoryId: 'cat-1',
                name: 'Outdoor',
                description: 'Outdoor property services',
                createdAt: '2024-01-01T00:00:00Z',
            },
        ];
        vi.spyOn(categoriesApi, 'list').mockResolvedValue({ items: mockCategories });

        render(<CategoriesPage />);

        await waitFor(() => {
            expect(categoriesApi.list).toHaveBeenCalled();
        });

        await waitFor(() => {
            expect(screen.getByText('Outdoor')).toBeInTheDocument();
        });
    });

    it('should render stat card with count', async () => {
        vi.spyOn(categoriesApi, 'list').mockResolvedValue({ items: [] });

        render(<CategoriesPage />);

        await waitFor(() => {
            expect(screen.getByText('Categories')).toBeInTheDocument();
        });
    });

    it('should show empty state when no categories', async () => {
        vi.spyOn(categoriesApi, 'list').mockResolvedValue({ items: [] });

        render(<CategoriesPage />);

        await waitFor(() => {
            expect(screen.getByText('No categories found. Create one to get started.')).toBeInTheDocument();
        });
    });

    it('should show create button', async () => {
        vi.spyOn(categoriesApi, 'list').mockResolvedValue({ items: [] });

        render(<CategoriesPage />);

        expect(screen.getByText('New Category')).toBeInTheDocument();
    });

    it('should show error on load failure', async () => {
        vi.spyOn(categoriesApi, 'list').mockRejectedValue(new Error('fail'));

        render(<CategoriesPage />);

        await waitFor(() => {
            expect(screen.getByText('Failed to load categories.')).toBeInTheDocument();
        });
    });

    it('should show create dialog with Name and Description fields', async () => {
        vi.spyOn(categoriesApi, 'list').mockResolvedValue({ items: [] });

        render(<CategoriesPage />);

        fireEvent.click(screen.getByText('New Category'));

        await waitFor(() => {
            expect(screen.getByLabelText('Name')).toBeInTheDocument();
        });
        expect(screen.getByLabelText('Description')).toBeInTheDocument();
    });
});
