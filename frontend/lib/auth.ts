export const ADMIN_GROUPS = ['SuperAdmin', 'Admin', 'Manager'] as const;

export type AdminRole = (typeof ADMIN_GROUPS)[number];

export function isAdminGroup(groups: string[]): boolean {
    return groups.some((g) => (ADMIN_GROUPS as readonly string[]).includes(g));
}

export function isSuperAdmin(groups: string[]): boolean {
    return groups.includes('SuperAdmin');
}

export function isAdmin(groups: string[]): boolean {
    return groups.includes('Admin');
}

export function isManager(groups: string[]): boolean {
    return groups.includes('Manager');
}

export function getHighestRole(groups: string[]): AdminRole | null {
    for (const role of ADMIN_GROUPS) {
        if (groups.includes(role)) return role;
    }
    return null;
}
