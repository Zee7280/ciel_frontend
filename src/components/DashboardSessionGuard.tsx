"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isTokenValid } from "@/utils/api";
import { decideDashboardAccess } from "@/utils/dashboardAccess";
import { readDashboardNavRoleFromStorage } from "@/utils/dashboardNavRole";

/**
 * Every role dashboard: signed-out / expired visitors go to login, and a user who opens another
 * role's dashboard URL is sent to their own. Re-checks on focus, on a back/forward-cache restore
 * (back button after logout) and when another tab logs out (storage event). UX guard only — the
 * backend remains the authority on what each role may read or do.
 */
export default function DashboardSessionGuard() {
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        const check = () => {
            let token: string | null = null;
            try {
                token = localStorage.getItem("ciel_token");
            } catch {
                token = null;
            }
            const decision = decideDashboardAccess({
                pathname: window.location.pathname,
                tokenValid: isTokenValid(token),
                role: readDashboardNavRoleFromStorage(),
            });
            if (decision.action === "login") router.replace("/login");
            else if (decision.action === "redirect") router.replace(decision.to);
        };
        check();

        const onStorage = (e: StorageEvent) => {
            if (e.key === null || e.key === "ciel_token" || e.key === "ciel_user" || e.key === "user") check();
        };
        const onPageShow = (e: PageTransitionEvent) => {
            if (e.persisted) check();
        };
        const onVisible = () => {
            if (document.visibilityState === "visible") check();
        };
        window.addEventListener("storage", onStorage);
        window.addEventListener("pageshow", onPageShow);
        window.addEventListener("focus", check);
        document.addEventListener("visibilitychange", onVisible);
        return () => {
            window.removeEventListener("storage", onStorage);
            window.removeEventListener("pageshow", onPageShow);
            window.removeEventListener("focus", check);
            document.removeEventListener("visibilitychange", onVisible);
        };
    }, [pathname, router]);

    return null;
}
