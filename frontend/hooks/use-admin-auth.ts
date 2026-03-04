'use client';

import { useAuthenticator } from '@aws-amplify/ui-react';
import { fetchAuthSession } from 'aws-amplify/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { isAdminGroup } from '@/lib/auth';

export function useAdminAuth() {
    const { authStatus } = useAuthenticator((context) => [context.authStatus]);
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [userGroups, setUserGroups] = useState<string[]>([]);

    useEffect(() => {
        if (authStatus === 'unauthenticated') {
            router.push('/login');
            return;
        }

        if (authStatus === 'authenticated') {
            fetchAuthSession().then((session) => {
                const payload = session.tokens?.accessToken?.payload;
                const groups = (payload?.['cognito:groups'] || []) as string[];
                setUserGroups(groups);

                if (isAdminGroup(groups)) {
                    setIsAuthorized(true);
                } else {
                    router.push('/login?error=unauthorized');
                }
                setIsLoading(false);
            });
        }
    }, [authStatus, router]);

    return { isAuthorized, isLoading, userGroups };
}
