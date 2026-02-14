import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Home from '../../app/page';

// Mock child components to simplify testing
vi.mock('../../components/LocationPicker', () => ({
    default: ({ onLocationSelect }: { onLocationSelect: (loc: { lat: number; lng: number }) => void }) => (
        <div data-testid="location-picker">
            <button
                type="button"
                onClick={() => onLocationSelect({ lat: 40.7, lng: -111.9 })}
            >
                Select Location
            </button>
        </div>
    ),
}));

vi.mock('../../components/PhotoUploader', () => ({
    default: ({ onFilesChange }: { onFilesChange: (files: File[]) => void }) => (
        <div data-testid="photo-uploader">
            <button
                type="button"
                onClick={() => onFilesChange([new File(['content'], 'test.jpg', { type: 'image/jpeg' })])}
            >
                Add Photo
            </button>
        </div>
    ),
}));

vi.mock('../../components/TimePicker12Hour', () => ({
    TimePicker12Hour: ({ value, onChange }: { value: string, onChange: (v: string) => void }) => (
        <input
            data-testid="time-picker"
            value={value}
            onChange={(e) => onChange(e.target.value)}
        />
    ),
}));

// Mock react-google-recaptcha-v3
vi.mock('react-google-recaptcha-v3', () => ({
    GoogleReCaptchaProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    useGoogleReCaptcha: () => ({
        executeRecaptcha: vi.fn().mockResolvedValue('mock-captcha-token'),
    }),
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('ReportForm', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubEnv('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY', 'mock-key');
        vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://localhost:3000');
        vi.stubEnv('NEXT_PUBLIC_RECAPTCHA_SITE_KEY', 'mock-site-key');
    });

    it('should render the form title', () => {
        render(<Home />);
        expect(screen.getByText('S&L Construction')).toBeInTheDocument();
        expect(screen.getByText('Report a Concern')).toBeInTheDocument();
    });

    it('should allow filling out the form and submitting', async () => {
        // Mock getUploadUrl
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ uploadUrl: 'http://upload-url', key: 'image-key' }),
        });
        // Mock uploadImage (PUT)
        mockFetch.mockResolvedValueOnce({
            ok: true,
        });
        // Mock createReport (POST)
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ reportId: '123' }),
        });

        render(<Home />);

        // Fill inputs
        fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: 'John Doe' } });
        fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'john@example.com' } });

        // Select concern type
        fireEvent.change(screen.getByLabelText(/Type of Concern/i), { target: { value: 'Visibile Sediment / Dirty Water' } }); // Note: typo in source? "Visible"

        const concernSelect = screen.getByLabelText(/Type of Concern/i);
        fireEvent.change(concernSelect, { target: { value: 'Visible Sediment / Dirty Water' } });

        // Select location
        fireEvent.click(screen.getByText('Select Location'));

        // Add photo
        fireEvent.click(screen.getByText('Add Photo'));

        // Submit
        const submitBtn = screen.getByText('Submit Report');
        expect(submitBtn).toBeEnabled();
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledTimes(3); // getUploadUrl, upload, createReport
        });

        // Verify createReport call payload
        const createReportCall = mockFetch.mock.calls[2];
        expect(createReportCall[0]).toContain('/reports');
        expect(JSON.parse(createReportCall[1].body)).toEqual(expect.objectContaining({
            name: 'John Doe',
            email: 'john@example.com',
            concernType: 'Visible Sediment / Dirty Water',
            imageKeys: ['image-key'],
            location: { lat: 40.7, lng: -111.9 },
        }));

        // Expect success message
        await waitFor(() => {
            expect(screen.getByText('Report Submitted!')).toBeInTheDocument();
        });
    });

    it('should show error if submission fails', async () => {
        // Mock getUploadUrl
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ uploadUrl: 'http://upload-url', key: 'image-key' }),
        });
        // Mock uploadImage
        mockFetch.mockResolvedValueOnce({ ok: true });
        // Mock createReport failure
        mockFetch.mockResolvedValueOnce({ ok: false });

        render(<Home />);

        // Fill minimal required
        fireEvent.change(screen.getByLabelText(/Type of Concern/i), { target: { value: 'Other' } });
        fireEvent.click(screen.getByText('Select Location'));
        fireEvent.click(screen.getByText('Add Photo'));

        // Spy on window.alert
        const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => { });

        fireEvent.click(screen.getByText('Submit Report'));

        await waitFor(() => {
            expect(alertSpy).toHaveBeenCalledWith('Failed to submit report. Please try again.');
        });
    });
});
