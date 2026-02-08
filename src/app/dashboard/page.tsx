"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function DashboardRedirect() {
    const router = useRouter();

    useEffect(() => {
        // Check for user login status
        const token = localStorage.getItem("ciel_token");
        const userStr = localStorage.getItem("ciel_user");

        if (token && userStr) {
            try {
                const user = JSON.parse(userStr);
                const role = user.role;

                if (role) {
                    router.replace(`/dashboard/${role}`);
                    return;
                }
            } catch (e) {
                console.error("Failed to parse user data", e);
            }
        }

        // Default to login if no valid session found
        router.replace("/login");
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                <p className="text-slate-500 font-medium">Redirecting to dashboard...</p>
            </div>
        </div>
    );
}
