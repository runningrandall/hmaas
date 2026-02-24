import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Home from '../../app/page';

describe('Home page', () => {
    it('should show configuration required when API URL is not set', () => {
        vi.stubEnv('NEXT_PUBLIC_API_URL', '');

        render(<Home />);

        expect(screen.getByText('Configuration Required')).toBeInTheDocument();
    });

    it('should render the Versa landing page when API URL is set', () => {
        vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://localhost:3001/');

        render(<Home />);

        expect(screen.getByText('Versa')).toBeInTheDocument();
        expect(screen.getByText('Premium Property Management')).toBeInTheDocument();
        expect(screen.getByText('All Your Property Needs, One Simple Bundle')).toBeInTheDocument();
    });

    it('should render service cards', () => {
        vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://localhost:3001/');

        render(<Home />);

        expect(screen.getByText('Lawn Care')).toBeInTheDocument();
        expect(screen.getByText('Pest Control')).toBeInTheDocument();
        expect(screen.getByText('Window Cleaning')).toBeInTheDocument();
        expect(screen.getByText('Snow Removal')).toBeInTheDocument();
    });

    it('should render navigation links', () => {
        vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://localhost:3001/');

        render(<Home />);

        expect(screen.getByText('Login / Sign Up')).toBeInTheDocument();
        expect(screen.getByText('Profile')).toBeInTheDocument();
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    });
});
