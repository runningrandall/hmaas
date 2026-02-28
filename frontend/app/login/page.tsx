'use client';

import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense, useMemo } from 'react';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { fetchAuthSession, signOut } from 'aws-amplify/auth';
import { isAdminGroup } from '@/lib/auth';

const ACCESS_DENIED_MESSAGE = 'Access denied. This application is for administrators only.';

function LoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { authStatus } = useAuthenticator(context => [context.authStatus]);
    const [signOutError, setSignOutError] = useState('');

    const unauthorizedFromRedirect = useMemo(
        () => searchParams.get('error') === 'unauthorized',
        [searchParams],
    );

    useEffect(() => {
        if (authStatus === 'authenticated') {
            fetchAuthSession().then(async (session) => {
                const payload = session.tokens?.accessToken?.payload;
                const groups = (payload?.['cognito:groups'] || []) as string[];

                if (isAdminGroup(groups)) {
                    router.push('/admin');
                } else {
                    await signOut();
                    setSignOutError(ACCESS_DENIED_MESSAGE);
                }
            });
        }
    }, [authStatus, router]);

    const errorMessage = signOutError || (unauthorizedFromRedirect ? ACCESS_DENIED_MESSAGE : '');

    return (
        <div className="flex flex-col justify-center items-center h-screen bg-gray-50">
            {errorMessage && (
                <div className="mb-4 max-w-md w-full px-4">
                    <div className="bg-destructive/15 text-destructive p-3 rounded-md border border-destructive/20 text-sm text-center">
                        {errorMessage}
                    </div>
                </div>
            )}
            <Authenticator />
        </div>
    );
}

export default function Login() {
    return (
        <Suspense fallback={
            <div className="flex justify-center items-center h-screen bg-gray-50">
                <Authenticator />
            </div>
        }>
            <LoginContent />
        </Suspense>
    );
}
