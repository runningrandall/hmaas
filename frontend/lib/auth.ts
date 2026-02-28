export const ADMIN_GROUPS = ['SuperAdmin', 'Admin', 'Manager'] as const;

export function isAdminGroup(groups: string[]): boolean {
    return groups.some((g) => (ADMIN_GROUPS as readonly string[]).includes(g));
}
