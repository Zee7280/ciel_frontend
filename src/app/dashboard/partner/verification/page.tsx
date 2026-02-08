"use client"

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function VerificationRedirect() {
    const router = useRouter();

    useEffect(() => {
        // Redirect to new verify page
        router.replace('/dashboard/partner/verify');
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
                <p className="text-slate-600 font-medium">Redirecting...</p>
            </div>
        </div>
    );
}
