'use client';

import { createContext, useContext } from 'react';
import type { AdminRole } from '@/lib/auth';

interface AdminAuthState {
    userGroups: string[];
    isSuperAdmin: boolean;
    highestRole: AdminRole | null;
}

const AdminAuthContext = createContext<AdminAuthState | null>(null);

export function AdminAuthProvider({
    children,
    userGroups,
    isSuperAdmin,
    highestRole,
}: AdminAuthState & { children: React.ReactNode }) {
    return (
        <AdminAuthContext.Provider value={{ userGroups, isSuperAdmin, highestRole }}>
            {children}
        </AdminAuthContext.Provider>
    );
}

const defaultState: AdminAuthState = {
    userGroups: [],
    isSuperAdmin: false,
    highestRole: null,
};

export function useAdminAuthContext(): AdminAuthState {
    const ctx = useContext(AdminAuthContext);
    return ctx ?? defaultState;
}
