/**
 * Normalize a US phone number to XXX-XXX-XXXX format.
 * Strips all non-digit characters, then formats if 10 digits remain.
 * Returns the cleaned string as-is if it doesn't match 10 digits.
 */
export function normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    // Handle 11-digit numbers starting with 1 (US country code)
    const normalized = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
    if (normalized.length === 10) {
        return `${normalized.slice(0, 3)}-${normalized.slice(3, 6)}-${normalized.slice(6)}`;
    }
    return phone;
}

/**
 * Normalize a US state to its 2-letter uppercase abbreviation.
 * Handles common full state names and already-abbreviated inputs.
 */
const STATE_MAP: Record<string, string> = {
    'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
    'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
    'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
    'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
    'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
    'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
    'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
    'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
    'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
    'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
    'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
    'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
    'wisconsin': 'WI', 'wyoming': 'WY', 'district of columbia': 'DC',
};

const VALID_ABBREVIATIONS = new Set(Object.values(STATE_MAP));

export function normalizeState(state: string): string {
    const trimmed = state.trim();
    const upper = trimmed.toUpperCase();
    if (upper.length === 2 && VALID_ABBREVIATIONS.has(upper)) {
        return upper;
    }
    return STATE_MAP[trimmed.toLowerCase()] || trimmed;
}

/**
 * Normalize a ZIP code to standard 5-digit or 5+4 format.
 * Strips spaces, pads with leading zeros if needed.
 */
export function normalizeZip(zip: string): string {
    const cleaned = zip.trim().replace(/\s/g, '');
    // Already in ZIP+4 format
    if (/^\d{5}-\d{4}$/.test(cleaned)) return cleaned;
    // Just digits, pad to 5
    const digits = cleaned.replace(/\D/g, '');
    if (digits.length === 5) return digits;
    if (digits.length === 9) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    return cleaned;
}

/**
 * Normalize a street address to USPS standard format.
 * - Title case
 * - Standard abbreviations (Street→St, Avenue→Ave, etc.)
 */
const ADDRESS_ABBREVIATIONS: Record<string, string> = {
    'street': 'St', 'avenue': 'Ave', 'boulevard': 'Blvd', 'drive': 'Dr',
    'lane': 'Ln', 'road': 'Rd', 'court': 'Ct', 'circle': 'Cir',
    'place': 'Pl', 'terrace': 'Ter', 'trail': 'Trl', 'way': 'Way',
    'parkway': 'Pkwy', 'highway': 'Hwy', 'expressway': 'Expy',
    'north': 'N', 'south': 'S', 'east': 'E', 'west': 'W',
    'northeast': 'NE', 'northwest': 'NW', 'southeast': 'SE', 'southwest': 'SW',
    'apartment': 'Apt', 'suite': 'Ste', 'building': 'Bldg', 'floor': 'Fl',
    'unit': 'Unit', 'room': 'Rm', 'department': 'Dept',
};

function titleCase(word: string): string {
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

export function normalizeAddress(address: string): string {
    return address.trim().replace(/\s+/g, ' ').split(' ').map((word) => {
        const lower = word.toLowerCase().replace(/[.,]/g, '');
        if (ADDRESS_ABBREVIATIONS[lower]) return ADDRESS_ABBREVIATIONS[lower];
        // Keep existing abbreviations if already short (e.g., "St", "Ave")
        if (word.length <= 3 && word[0] === word[0].toUpperCase()) return word;
        // Handle # for unit numbers
        if (word.startsWith('#')) return word;
        return titleCase(word);
    }).join(' ');
}

/**
 * Normalize a city name to title case.
 */
export function normalizeCity(city: string): string {
    return city.trim().replace(/\s+/g, ' ').split(' ').map(titleCase).join(' ');
}
