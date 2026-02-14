import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Profile from '../../../app/profile/page';
import * as auth from 'aws-amplify/auth';

// Mocks
const mockPush = vi.fn();
const mockSignOut = vi.fn();

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: mockPush,
    }),
}));

vi.mock('@aws-amplify/ui-react', () => ({
    useAuthenticator: () => ({
        authStatus: 'authenticated',
        signOut: mockSignOut,
    }),
}));

vi.mock('aws-amplify/auth', () => ({
    fetchAuthSession: vi.fn(),
    fetchUserAttributes: vi.fn(),
    updatePassword: vi.fn(),
}));

describe('Profile Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(auth.fetchAuthSession).mockResolvedValue({
            tokens: {
                accessToken: {
                    payload: {
                        'cognito:groups': ['User'],
                        username: 'testuser',
                    },
                },
            },
        });
        vi.mocked(auth.fetchUserAttributes).mockResolvedValue({
            email: 'test@example.com',
        });
    });

    it('should render user details', async () => {
        render(<Profile />);

        await waitFor(() => {
            expect(screen.getByText('testuser')).toBeInTheDocument();
        });
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
        expect(screen.getByText('User')).toBeInTheDocument();
    });

    it('should handle password change success', async () => {
        vi.mocked(auth.updatePassword).mockResolvedValue();

        render(<Profile />);

        await waitFor(() => screen.getByLabelText('Current Password'));

        fireEvent.change(screen.getByLabelText('Current Password'), { target: { value: 'oldpass' } });
        fireEvent.change(screen.getByLabelText('New Password'), { target: { value: 'newpass123' } });
        fireEvent.change(screen.getByLabelText('Confirm New Password'), { target: { value: 'newpass123' } });

        const form = screen.getByText('Update Password').closest('form');
        if (form) form.setAttribute('novalidate', 'true');

        const updateBtn = screen.getByText('Update Password');
        fireEvent.click(updateBtn);

        await waitFor(() => {
            expect(screen.getByText('Password updated successfully!')).toBeInTheDocument();
        });
        expect(auth.updatePassword).toHaveBeenCalledWith({ oldPassword: 'oldpass', newPassword: 'newpass123' });
    });

    it('should validate password mismatch', async () => {
        render(<Profile />);

        await waitFor(() => screen.getByLabelText('Current Password'));

        fireEvent.change(screen.getByLabelText('New Password'), { target: { value: 'pass1' } });
        fireEvent.change(screen.getByLabelText('Confirm New Password'), { target: { value: 'pass2' } });

        const form = screen.getByText('Update Password').closest('form');
        if (form) form.setAttribute('novalidate', 'true');

        fireEvent.click(screen.getByText('Update Password'));

        expect(screen.getByText('New passwords do not match')).toBeInTheDocument();
        expect(auth.updatePassword).not.toHaveBeenCalled();
    });

    it('should validate password length', async () => {
        render(<Profile />);

        await waitFor(() => screen.getByLabelText('Current Password'));

        fireEvent.change(screen.getByLabelText('New Password'), { target: { value: 'shor' } }); // < 8 chars
        fireEvent.change(screen.getByLabelText('Confirm New Password'), { target: { value: 'shor' } });

        const form = screen.getByText('Update Password').closest('form');
        if (form) form.setAttribute('novalidate', 'true');

        fireEvent.click(screen.getByText('Update Password'));

        expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
        expect(auth.updatePassword).not.toHaveBeenCalled();
    });

    it('should handle update error', async () => {
        vi.mocked(auth.updatePassword).mockRejectedValue(new Error('Update failed'));

        render(<Profile />);

        await waitFor(() => screen.getByLabelText('Current Password'));

        fireEvent.change(screen.getByLabelText('Current Password'), { target: { value: 'oldpass' } });
        fireEvent.change(screen.getByLabelText('New Password'), { target: { value: 'newpass123' } });
        fireEvent.change(screen.getByLabelText('Confirm New Password'), { target: { value: 'newpass123' } });

        const form = screen.getByText('Update Password').closest('form');
        if (form) form.setAttribute('novalidate', 'true');

        fireEvent.click(screen.getByText('Update Password'));

        await waitFor(() => {
            expect(screen.getByText('Update failed')).toBeInTheDocument();
        });
    });
});
