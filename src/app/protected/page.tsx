import { currentUser } from '@clerk/nextjs/server';

export default async function ProtectedPage() {
    const user = await currentUser();

    if (!user) return <div>Not signed in</div>;

    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-24">
            <h1 className="text-4xl font-bold mb-4">Protected Route</h1>
            <p className="text-xl">
                Welcome, {user.firstName || user.emailAddresses[0].emailAddress}!
            </p>
            <p className="mt-4 text-gray-500">
                This page is protected by Clerk Middleware.
            </p>
        </div>
    );
}
