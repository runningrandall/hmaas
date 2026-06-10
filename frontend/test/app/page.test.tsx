import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Home from '../../app/page';

describe('Home page', () => {
    it('should render the Versa landing page', () => {
        vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://localhost:3001/');

        render(<Home />);

        expect(screen.getByText('Versa')).toBeInTheDocument();
        expect(screen.getByText('Property Management')).toBeInTheDocument();
    });

    it('should render service cards', () => {
        vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://localhost:3001/');

        render(<Home />);

        expect(screen.getByText('Window Cleaning')).toBeInTheDocument();
        expect(screen.getByText('Lawn Mow & Trim')).toBeInTheDocument();
        expect(screen.getByText('Gutter Cleaning')).toBeInTheDocument();
        expect(screen.getByText('Sprinkler Winterization')).toBeInTheDocument();
    });

    it('should not expose login or profile links in the nav', () => {
        vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://localhost:3001/');

        render(<Home />);

        expect(screen.queryByText('Login / Sign Up')).not.toBeInTheDocument();
        expect(screen.queryByText('Profile')).not.toBeInTheDocument();
    });

    it('should render the Get a Free Quote CTA', () => {
        vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://localhost:3001/');

        render(<Home />);

        expect(screen.getAllByText('Get a Free Quote').length).toBeGreaterThan(0);
    });
});
