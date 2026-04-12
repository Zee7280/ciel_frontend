"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
    isFacultyProfileComplete,
    isPartnerProfileComplete,
    isStudentProfileComplete,
} from "@/utils/profileCompletion";

/**
 * Redirects student/partner/faculty to their profile until required fields exist on the cached user
 * (localStorage, merged after login / profile save). Admin is not gated.
 * Create-opportunity pages also re-check to avoid submit with stale cache.
 */
export default function ProfileCompletionGate({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        if (typeof window === "undefined") return;
        if (!localStorage.getItem("ciel_token")) return;

        let user: Record<string, unknown>;
        try {
            const raw = localStorage.getItem("ciel_user") || localStorage.getItem("user");
            if (!raw) return;
            user = JSON.parse(raw) as Record<string, unknown>;
        } catch {
            return;
        }

        if (pathname.startsWith("/dashboard/student")) {
            if (pathname.startsWith("/dashboard/student/profile")) return;
            if (!isStudentProfileComplete(user)) {
                router.replace("/dashboard/student/profile");
            }
            return;
        }

        if (pathname.startsWith("/dashboard/partner")) {
            if (pathname.startsWith("/dashboard/partner/profile")) return;
            if (!isPartnerProfileComplete(user)) {
                router.replace("/dashboard/partner/profile");
                return;
            }
            return;
        }

        if (pathname.startsWith("/dashboard/faculty")) {
            if (pathname.startsWith("/dashboard/faculty/profile")) return;
            if (!isFacultyProfileComplete(user)) {
                router.replace("/dashboard/faculty/profile");
                return;
            }
        }
    }, [pathname, router]);

    return <>{children}</>;
}
