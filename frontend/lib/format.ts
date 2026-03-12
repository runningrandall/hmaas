/**
 * Format a phone input as the user types (XXX-XXX-XXXX).
 * Only allows digits and auto-inserts dashes.
 */
export function formatPhoneInput(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/**
 * Normalize a US state abbreviation to uppercase.
 */
export function formatStateInput(value: string): string {
    return value.toUpperCase().slice(0, 2);
}
