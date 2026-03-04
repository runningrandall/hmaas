import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import CategoryTagInput from '../../components/CategoryTagInput';
import { categoriesApi, serviceTypeCategoriesApi, planCategoriesApi } from '../../lib/api/categories';

vi.mock('../../lib/api/categories', () => ({
    categoriesApi: {
        list: vi.fn(),
        create: vi.fn(),
    },
    serviceTypeCategoriesApi: {
        list: vi.fn(),
        add: vi.fn(),
        remove: vi.fn(),
    },
    planCategoriesApi: {
        list: vi.fn(),
        add: vi.fn(),
        remove: vi.fn(),
    },
}));

const mockCategories = [
    { categoryId: 'cat-1', name: 'Outdoor', organizationId: 'GLOBAL', createdAt: '2024-01-01' },
    { categoryId: 'cat-2', name: 'Indoor', organizationId: 'GLOBAL', createdAt: '2024-01-01' },
    { categoryId: 'cat-3', name: 'Seasonal', organizationId: 'GLOBAL', createdAt: '2024-01-01' },
];

describe('CategoryTagInput', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render assigned categories as badges for serviceType', async () => {
        vi.mocked(categoriesApi.list).mockResolvedValue({ items: mockCategories });
        vi.mocked(serviceTypeCategoriesApi.list).mockResolvedValue({
            items: [
                { entityType: 'serviceType', entityId: 'st-1', categoryId: 'cat-1', organizationId: 'GLOBAL', createdAt: '2024-01-01' },
            ],
        });

        render(<CategoryTagInput entityType="serviceType" entityId="st-1" />);

        await waitFor(() => {
            expect(screen.getByText('Outdoor')).toBeInTheDocument();
        });
        expect(screen.queryByText('Indoor')).not.toBeInTheDocument();
    });

    it('should render assigned categories for plan', async () => {
        vi.mocked(categoriesApi.list).mockResolvedValue({ items: mockCategories });
        vi.mocked(planCategoriesApi.list).mockResolvedValue({
            items: [
                { entityType: 'plan', entityId: 'plan-1', categoryId: 'cat-2', organizationId: 'GLOBAL', createdAt: '2024-01-01' },
            ],
        });

        render(<CategoryTagInput entityType="plan" entityId="plan-1" />);

        await waitFor(() => {
            expect(screen.getByText('Indoor')).toBeInTheDocument();
        });
    });

    it('should show loading state', () => {
        vi.mocked(categoriesApi.list).mockReturnValue(new Promise(() => {}));
        vi.mocked(serviceTypeCategoriesApi.list).mockReturnValue(new Promise(() => {}));

        render(<CategoryTagInput entityType="serviceType" entityId="st-1" />);

        expect(screen.getByText('Loading categories...')).toBeInTheDocument();
    });

    it('should show Add button when not disabled', async () => {
        vi.mocked(categoriesApi.list).mockResolvedValue({ items: [] });
        vi.mocked(serviceTypeCategoriesApi.list).mockResolvedValue({ items: [] });

        render(<CategoryTagInput entityType="serviceType" entityId="st-1" />);

        await waitFor(() => {
            expect(screen.getByText('Add')).toBeInTheDocument();
        });
    });

    it('should not show Add button when disabled', async () => {
        vi.mocked(categoriesApi.list).mockResolvedValue({ items: [] });
        vi.mocked(serviceTypeCategoriesApi.list).mockResolvedValue({ items: [] });

        render(<CategoryTagInput entityType="serviceType" entityId="st-1" disabled />);

        await waitFor(() => {
            expect(screen.queryByText('Add')).not.toBeInTheDocument();
        });
    });

    it('should not show remove buttons when disabled', async () => {
        vi.mocked(categoriesApi.list).mockResolvedValue({ items: mockCategories });
        vi.mocked(serviceTypeCategoriesApi.list).mockResolvedValue({
            items: [
                { entityType: 'serviceType', entityId: 'st-1', categoryId: 'cat-1', organizationId: 'GLOBAL', createdAt: '2024-01-01' },
            ],
        });

        render(<CategoryTagInput entityType="serviceType" entityId="st-1" disabled />);

        await waitFor(() => {
            expect(screen.getByText('Outdoor')).toBeInTheDocument();
        });
        // Badge should render but without remove button
        const badge = screen.getByText('Outdoor').closest('div');
        expect(badge?.querySelector('button')).toBeNull();
    });

    it('should call remove when X is clicked on a badge', async () => {
        vi.mocked(categoriesApi.list).mockResolvedValue({ items: mockCategories });
        vi.mocked(serviceTypeCategoriesApi.list).mockResolvedValue({
            items: [
                { entityType: 'serviceType', entityId: 'st-1', categoryId: 'cat-1', organizationId: 'GLOBAL', createdAt: '2024-01-01' },
            ],
        });
        vi.mocked(serviceTypeCategoriesApi.remove).mockResolvedValue(undefined);

        render(<CategoryTagInput entityType="serviceType" entityId="st-1" />);

        await waitFor(() => {
            expect(screen.getByText('Outdoor')).toBeInTheDocument();
        });

        const removeButton = screen.getByText('Outdoor').parentElement?.querySelector('button');
        fireEvent.click(removeButton!);

        expect(serviceTypeCategoriesApi.remove).toHaveBeenCalledWith('st-1', 'cat-1');
    });

    it('should revert optimistic remove on error', async () => {
        vi.mocked(categoriesApi.list).mockResolvedValue({ items: mockCategories });
        vi.mocked(serviceTypeCategoriesApi.list).mockResolvedValue({
            items: [
                { entityType: 'serviceType', entityId: 'st-1', categoryId: 'cat-1', organizationId: 'GLOBAL', createdAt: '2024-01-01' },
            ],
        });
        vi.mocked(serviceTypeCategoriesApi.remove).mockRejectedValue(new Error('fail'));

        render(<CategoryTagInput entityType="serviceType" entityId="st-1" />);

        await waitFor(() => {
            expect(screen.getByText('Outdoor')).toBeInTheDocument();
        });

        const removeButton = screen.getByText('Outdoor').parentElement?.querySelector('button');
        fireEvent.click(removeButton!);

        // After error, badge should reappear
        await waitFor(() => {
            expect(screen.getByText('Outdoor')).toBeInTheDocument();
        });
    });

    it('should open popover and show available categories when Add is clicked', async () => {
        vi.mocked(categoriesApi.list).mockResolvedValue({ items: mockCategories });
        vi.mocked(serviceTypeCategoriesApi.list).mockResolvedValue({
            items: [
                { entityType: 'serviceType', entityId: 'st-1', categoryId: 'cat-1', organizationId: 'GLOBAL', createdAt: '2024-01-01' },
            ],
        });

        render(<CategoryTagInput entityType="serviceType" entityId="st-1" />);

        await waitFor(() => {
            expect(screen.getByText('Add')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Add'));

        await waitFor(() => {
            expect(screen.getByPlaceholderText('Search or create...')).toBeInTheDocument();
        });
        // Available (not assigned) categories should show
        expect(screen.getByText('Indoor')).toBeInTheDocument();
        expect(screen.getByText('Seasonal')).toBeInTheDocument();
    });

    it('should add a category when clicking an available category', async () => {
        vi.mocked(categoriesApi.list).mockResolvedValue({ items: mockCategories });
        vi.mocked(serviceTypeCategoriesApi.list).mockResolvedValue({ items: [] });
        vi.mocked(serviceTypeCategoriesApi.add).mockResolvedValue({
            entityType: 'serviceType', entityId: 'st-1', categoryId: 'cat-1', organizationId: 'GLOBAL', createdAt: '2024-01-01',
        });

        render(<CategoryTagInput entityType="serviceType" entityId="st-1" />);

        await waitFor(() => {
            expect(screen.getByText('Add')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Add'));

        await waitFor(() => {
            expect(screen.getByText('Outdoor')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Outdoor'));

        expect(serviceTypeCategoriesApi.add).toHaveBeenCalledWith('st-1', 'cat-1');
    });

    it('should filter categories by search', async () => {
        vi.mocked(categoriesApi.list).mockResolvedValue({ items: mockCategories });
        vi.mocked(serviceTypeCategoriesApi.list).mockResolvedValue({ items: [] });

        render(<CategoryTagInput entityType="serviceType" entityId="st-1" />);

        await waitFor(() => {
            expect(screen.getByText('Add')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Add'));

        const searchInput = await screen.findByPlaceholderText('Search or create...');
        fireEvent.change(searchInput, { target: { value: 'Out' } });

        await waitFor(() => {
            expect(screen.getByText('Outdoor')).toBeInTheDocument();
        });
        expect(screen.queryByText('Indoor')).not.toBeInTheDocument();
        expect(screen.queryByText('Seasonal')).not.toBeInTheDocument();
    });

    it('should show create option when search does not match any category', async () => {
        vi.mocked(categoriesApi.list).mockResolvedValue({ items: mockCategories });
        vi.mocked(serviceTypeCategoriesApi.list).mockResolvedValue({ items: [] });

        render(<CategoryTagInput entityType="serviceType" entityId="st-1" />);

        await waitFor(() => {
            expect(screen.getByText('Add')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Add'));

        const searchInput = await screen.findByPlaceholderText('Search or create...');
        fireEvent.change(searchInput, { target: { value: 'New Category' } });

        await waitFor(() => {
            expect(screen.getByText(/Create/)).toBeInTheDocument();
        });
    });

    it('should create a new category and assign it', async () => {
        vi.mocked(categoriesApi.list).mockResolvedValue({ items: mockCategories });
        vi.mocked(serviceTypeCategoriesApi.list).mockResolvedValue({ items: [] });
        const newCat = { categoryId: 'cat-new', name: 'New Category', organizationId: 'GLOBAL', createdAt: '2024-01-01' };
        vi.mocked(categoriesApi.create).mockResolvedValue(newCat);
        vi.mocked(serviceTypeCategoriesApi.add).mockResolvedValue({
            entityType: 'serviceType', entityId: 'st-1', categoryId: 'cat-new', organizationId: 'GLOBAL', createdAt: '2024-01-01',
        });

        render(<CategoryTagInput entityType="serviceType" entityId="st-1" />);

        await waitFor(() => {
            expect(screen.getByText('Add')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Add'));

        const searchInput = await screen.findByPlaceholderText('Search or create...');
        fireEvent.change(searchInput, { target: { value: 'New Category' } });

        const createBtn = await screen.findByText(/Create/);
        fireEvent.click(createBtn);

        await waitFor(() => {
            expect(categoriesApi.create).toHaveBeenCalledWith({ name: 'New Category' });
        });
        expect(serviceTypeCategoriesApi.add).toHaveBeenCalledWith('st-1', 'cat-new');
    });

    it('should show "No categories available" when no categories exist and no search', async () => {
        vi.mocked(categoriesApi.list).mockResolvedValue({ items: [] });
        vi.mocked(serviceTypeCategoriesApi.list).mockResolvedValue({ items: [] });

        render(<CategoryTagInput entityType="serviceType" entityId="st-1" />);

        await waitFor(() => {
            expect(screen.getByText('Add')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Add'));

        await waitFor(() => {
            expect(screen.getByText('No categories available')).toBeInTheDocument();
        });
    });

    it('should handle loadData error gracefully', async () => {
        vi.mocked(categoriesApi.list).mockRejectedValue(new Error('fail'));
        vi.mocked(serviceTypeCategoriesApi.list).mockRejectedValue(new Error('fail'));

        render(<CategoryTagInput entityType="serviceType" entityId="st-1" />);

        // Should stop loading and show empty state
        await waitFor(() => {
            expect(screen.queryByText('Loading categories...')).not.toBeInTheDocument();
        });
        expect(screen.getByText('Add')).toBeInTheDocument();
    });

    it('should revert optimistic add on error', async () => {
        vi.mocked(categoriesApi.list).mockResolvedValue({ items: mockCategories });
        vi.mocked(serviceTypeCategoriesApi.list).mockResolvedValue({ items: [] });
        vi.mocked(serviceTypeCategoriesApi.add).mockRejectedValue(new Error('fail'));

        render(<CategoryTagInput entityType="serviceType" entityId="st-1" />);

        await waitFor(() => {
            expect(screen.getByText('Add')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Add'));

        await waitFor(() => {
            expect(screen.getByText('Outdoor')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Outdoor'));

        // After error, it should revert and not show badge anymore (Outdoor back in available list)
        await waitFor(() => {
            expect(serviceTypeCategoriesApi.add).toHaveBeenCalled();
        });
    });
});
