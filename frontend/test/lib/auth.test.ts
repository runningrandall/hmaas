import { describe, it, expect } from 'vitest';
import { isSuperAdmin, isAdmin, isManager, getHighestRole, isAdminGroup } from '../../lib/auth';

describe('auth helpers', () => {
    describe('isSuperAdmin', () => {
        it('returns true when groups contain SuperAdmin', () => {
            expect(isSuperAdmin(['SuperAdmin', 'Admin'])).toBe(true);
        });

        it('returns false when groups do not contain SuperAdmin', () => {
            expect(isSuperAdmin(['Admin', 'Manager'])).toBe(false);
        });

        it('returns false for empty groups', () => {
            expect(isSuperAdmin([])).toBe(false);
        });
    });

    describe('isAdmin', () => {
        it('returns true when groups contain Admin', () => {
            expect(isAdmin(['Admin'])).toBe(true);
        });

        it('returns false when groups do not contain Admin', () => {
            expect(isAdmin(['Manager'])).toBe(false);
        });
    });

    describe('isManager', () => {
        it('returns true when groups contain Manager', () => {
            expect(isManager(['Manager'])).toBe(true);
        });

        it('returns false when groups do not contain Manager', () => {
            expect(isManager(['Admin'])).toBe(false);
        });
    });

    describe('getHighestRole', () => {
        it('returns SuperAdmin when present', () => {
            expect(getHighestRole(['Manager', 'SuperAdmin', 'Admin'])).toBe('SuperAdmin');
        });

        it('returns Admin when SuperAdmin not present', () => {
            expect(getHighestRole(['Manager', 'Admin'])).toBe('Admin');
        });

        it('returns Manager when only Manager present', () => {
            expect(getHighestRole(['Manager'])).toBe('Manager');
        });

        it('returns null when no admin groups present', () => {
            expect(getHighestRole(['Customer', 'Servicer'])).toBeNull();
        });

        it('returns null for empty groups', () => {
            expect(getHighestRole([])).toBeNull();
        });
    });

    describe('isAdminGroup', () => {
        it('returns true for any admin group', () => {
            expect(isAdminGroup(['SuperAdmin'])).toBe(true);
            expect(isAdminGroup(['Admin'])).toBe(true);
            expect(isAdminGroup(['Manager'])).toBe(true);
        });

        it('returns false for non-admin groups', () => {
            expect(isAdminGroup(['Customer'])).toBe(false);
            expect(isAdminGroup([])).toBe(false);
        });
    });
});
