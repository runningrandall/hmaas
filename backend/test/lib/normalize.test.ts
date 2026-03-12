import { describe, it, expect } from 'vitest';
import { normalizePhone, normalizeState, normalizeZip, normalizeAddress, normalizeCity } from '../../src/lib/normalize';

describe('normalizePhone', () => {
    it('should format 10 digits to XXX-XXX-XXXX', () => {
        expect(normalizePhone('3035550100')).toBe('303-555-0100');
    });

    it('should strip non-digits and format', () => {
        expect(normalizePhone('(303) 555-0100')).toBe('303-555-0100');
        expect(normalizePhone('303.555.0100')).toBe('303-555-0100');
        expect(normalizePhone('303 555 0100')).toBe('303-555-0100');
    });

    it('should handle 11-digit with leading 1', () => {
        expect(normalizePhone('13035550100')).toBe('303-555-0100');
        expect(normalizePhone('+1 303 555 0100')).toBe('303-555-0100');
    });

    it('should return as-is if not 10 digits', () => {
        expect(normalizePhone('555')).toBe('555');
        expect(normalizePhone('12345')).toBe('12345');
    });

    it('should handle already formatted input', () => {
        expect(normalizePhone('303-555-0100')).toBe('303-555-0100');
    });
});

describe('normalizeState', () => {
    it('should uppercase 2-letter abbreviations', () => {
        expect(normalizeState('co')).toBe('CO');
        expect(normalizeState('Co')).toBe('CO');
    });

    it('should convert full state names', () => {
        expect(normalizeState('colorado')).toBe('CO');
        expect(normalizeState('Colorado')).toBe('CO');
        expect(normalizeState('New York')).toBe('NY');
    });

    it('should handle DC', () => {
        expect(normalizeState('district of columbia')).toBe('DC');
    });

    it('should return unknown values trimmed', () => {
        expect(normalizeState('  XX  ')).toBe('XX');
    });
});

describe('normalizeZip', () => {
    it('should return valid 5-digit zip', () => {
        expect(normalizeZip('80202')).toBe('80202');
    });

    it('should format ZIP+4', () => {
        expect(normalizeZip('802020001')).toBe('80202-0001');
    });

    it('should preserve existing ZIP+4 format', () => {
        expect(normalizeZip('80202-0001')).toBe('80202-0001');
    });

    it('should trim whitespace', () => {
        expect(normalizeZip(' 80202 ')).toBe('80202');
    });
});

describe('normalizeAddress', () => {
    it('should abbreviate common street types', () => {
        expect(normalizeAddress('123 main street')).toBe('123 Main St');
    });

    it('should abbreviate directions', () => {
        expect(normalizeAddress('456 north elm avenue')).toBe('456 N Elm Ave');
    });

    it('should title case other words', () => {
        expect(normalizeAddress('789 oak boulevard')).toBe('789 Oak Blvd');
    });

    it('should abbreviate apartment/suite', () => {
        expect(normalizeAddress('100 pine road apartment 5')).toBe('100 Pine Rd Apt 5');
    });

    it('should collapse extra whitespace', () => {
        expect(normalizeAddress('  123   main   street  ')).toBe('123 Main St');
    });
});

describe('normalizeCity', () => {
    it('should title case city names', () => {
        expect(normalizeCity('denver')).toBe('Denver');
        expect(normalizeCity('new york')).toBe('New York');
        expect(normalizeCity('SAN FRANCISCO')).toBe('San Francisco');
    });

    it('should trim and collapse whitespace', () => {
        expect(normalizeCity('  salt  lake  city  ')).toBe('Salt Lake City');
    });
});
