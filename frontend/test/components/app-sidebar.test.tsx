import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppSidebar } from '../../components/app-sidebar';
import { SidebarProvider } from '../../components/ui/sidebar';
import { AdminAuthProvider } from '../../contexts/admin-auth-context';

function renderSidebar({ isSuperAdmin = false }: { isSuperAdmin?: boolean } = {}) {
    const groups = isSuperAdmin ? ['SuperAdmin'] : ['Admin'];
    return render(
        <AdminAuthProvider
            userGroups={groups}
            isSuperAdmin={isSuperAdmin}
            highestRole={isSuperAdmin ? 'SuperAdmin' : 'Admin'}
        >
            <SidebarProvider>
                <AppSidebar />
            </SidebarProvider>
        </AdminAuthProvider>
    );
}

describe('AppSidebar', () => {
    it('should render management menu items', () => {
        renderSidebar();

        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Customers')).toBeInTheDocument();
        expect(screen.getByText('Properties')).toBeInTheDocument();
        expect(screen.getByText('Management')).toBeInTheDocument();
    });

    it('should render operations menu items', () => {
        renderSidebar();

        expect(screen.getByText('Schedules')).toBeInTheDocument();
        expect(screen.getByText('Employees')).toBeInTheDocument();
        expect(screen.getByText('Invoices')).toBeInTheDocument();
        expect(screen.getByText('Operations')).toBeInTheDocument();
    });

    it('should show Organizations link for SuperAdmin', () => {
        renderSidebar({ isSuperAdmin: true });

        expect(screen.getByText('Organizations')).toBeInTheDocument();
    });

    it('should not show Organizations link for non-SuperAdmin', () => {
        renderSidebar({ isSuperAdmin: false });

        expect(screen.queryByText('Organizations')).not.toBeInTheDocument();
    });

    it('should always show Settings link', () => {
        renderSidebar();

        expect(screen.getByText('Settings')).toBeInTheDocument();
    });
});
