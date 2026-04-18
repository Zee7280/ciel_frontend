"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { authenticatedFetch } from "@/utils/api";
import {
    isFacultyProfileComplete,
    isPartnerOrganizationComplete,
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
            if (pathname.startsWith("/dashboard/partner/organization")) return;
            const token = localStorage.getItem("ciel_token");
            const userId = user.id ?? user.userId ?? user.user_id;
            if (!token || userId == null || userId === "") {
                router.replace("/dashboard/partner/organization");
                return;
            }
            void (async () => {
                try {
                    const res = await authenticatedFetch("/api/v1/organisation/profile/detail", {
                        method: "POST",
                        body: JSON.stringify({ userId }),
                    }, { redirectToLogin: false });
                    if (!res?.ok) {
                        router.replace("/dashboard/partner/organization");
                        return;
                    }
                    const body = await res.json().catch(() => null);
                    const root =
                        body && typeof body === "object" && !Array.isArray(body)
                            ? (body as Record<string, unknown>)
                            : null;
                    const org =
                        root?.data && typeof root.data === "object" && !Array.isArray(root.data)
                            ? (root.data as Record<string, unknown>)
                            : root;
                    if (!org || !isPartnerOrganizationComplete(org)) {
                        router.replace("/dashboard/partner/organization");
                    }
                } catch {
                    router.replace("/dashboard/partner/organization");
                }
            })();
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
