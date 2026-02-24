import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppSidebar } from '../../components/app-sidebar';

import { SidebarProvider } from '../../components/ui/sidebar';

describe('AppSidebar', () => {
    it('should render management menu items', () => {
        render(
            <SidebarProvider>
                <AppSidebar />
            </SidebarProvider>
        );

        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Customers')).toBeInTheDocument();
        expect(screen.getByText('Properties')).toBeInTheDocument();
        expect(screen.getByText('Management')).toBeInTheDocument();
    });

    it('should render operations menu items', () => {
        render(
            <SidebarProvider>
                <AppSidebar />
            </SidebarProvider>
        );

        expect(screen.getByText('Schedules')).toBeInTheDocument();
        expect(screen.getByText('Employees')).toBeInTheDocument();
        expect(screen.getByText('Invoices')).toBeInTheDocument();
        expect(screen.getByText('Operations')).toBeInTheDocument();
    });
});
