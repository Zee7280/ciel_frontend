"use client";

import { useLayoutEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { isTokenValid } from "@/utils/api";
import { readDashboardNavRoleFromStorage } from "@/utils/dashboardNavRole";

type GuardState = "checking" | "allowed" | "denied";

/**
 * Client-side guard for every /dashboard/admin/* page. Non-admins (or signed-out visitors) are sent to
 * their own dashboard / login and never see admin UI. The first render (SSR + hydration) is always the
 * neutral "checking" state so server and client markup match; the layout effect resolves it before paint.
 * This is a UX guard only — the backend remains the authority on admin access.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
    const router = useRouter();
    const [state, setState] = useState<GuardState>("checking");

    useLayoutEffect(() => {
        let token: string | null = null;
        try {
            token = localStorage.getItem("ciel_token");
        } catch {
            token = null;
        }
        if (!isTokenValid(token)) {
            setState("denied");
            router.replace("/login");
            return;
        }
        const role = readDashboardNavRoleFromStorage();
        if (role === "admin") {
            setState("allowed");
            return;
        }
        setState("denied");
        router.replace(role ? `/dashboard/${role}` : "/login");
    }, [router]);

    if (state !== "allowed") {
        return (
            <div className="flex min-h-[320px] items-center justify-center" role="status" aria-label="Checking access">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#15988b] border-t-transparent" />
            </div>
        );
    }
    return <>{children}</>;
}
