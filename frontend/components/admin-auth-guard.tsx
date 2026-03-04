'use client';

import { Loader2 } from 'lucide-react';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { AdminAuthProvider } from '@/contexts/admin-auth-context';
import { isSuperAdmin, getHighestRole } from '@/lib/auth';

export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
    const { isAuthorized, isLoading, userGroups } = useAdminAuth();

    if (isLoading || !isAuthorized) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Checking authorization...</span>
            </div>
        );
    }

    return (
        <AdminAuthProvider
            userGroups={userGroups}
            isSuperAdmin={isSuperAdmin(userGroups)}
            highestRole={getHighestRole(userGroups)}
        >
            {children}
        </AdminAuthProvider>
    );
}
