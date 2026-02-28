'use client';

import { Loader2 } from 'lucide-react';
import { useAdminAuth } from '@/hooks/use-admin-auth';

export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
    const { isAuthorized, isLoading } = useAdminAuth();

    if (isLoading || !isAuthorized) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Checking authorization...</span>
            </div>
        );
    }

    return <>{children}</>;
}
