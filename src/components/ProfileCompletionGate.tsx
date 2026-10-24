"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { authenticatedFetch } from "@/utils/api";
import {
    isFacultyProfileComplete,
    isPartnerOrganizationComplete,
    isStudentProfileComplete,
} from "@/utils/profileCompletion";
import {
    partnerNeedsMembershipPayment,
    partnerPathAllowedDuringMembershipPending,
    refreshStoredUserFromMeApi,
} from "@/utils/membershipPayment";
import {
    STUDENT_SUBSCRIPTION_PATH,
    studentNeedsSubscriptionPayment,
    studentPathAllowedDuringSubscriptionPending,
} from "@/utils/studentSubscription";

/** The org page reads `complete=1` to explain why the partner was sent there. */
const PARTNER_COMPLETE_PROFILE_PATH = "/dashboard/partner/organization?complete=1";

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
            // Non-member-university students pay the subscription fee before anything else unlocks.
            if (studentNeedsSubscriptionPayment(user) && !studentPathAllowedDuringSubscriptionPending(pathname)) {
                router.replace(STUDENT_SUBSCRIPTION_PATH);
                return;
            }
            if (pathname.startsWith("/dashboard/student/profile")) return;
            // Create-opportunity re-checks /user/me itself and preserves a `next=` return URL.
            if (pathname.startsWith("/dashboard/student/create-opportunity")) return;
            if (!isStudentProfileComplete(user)) {
                router.replace("/dashboard/student/profile");
            }
            return;
        }

        if (pathname.startsWith("/dashboard/partner")) {
            if (partnerNeedsMembershipPayment(user)) {
                // Paying comes first: the profile check below would otherwise bounce them off the payment page.
                // The cached flag may be stale (admin turned the partner fee off), so confirm with `/users/me`
                // before sending anyone to a payment screen that no longer applies.
                if (!partnerPathAllowedDuringMembershipPending(pathname)) {
                    void (async () => {
                        await refreshStoredUserFromMeApi();
                        let fresh: Record<string, unknown> | null = null;
                        try {
                            const raw = localStorage.getItem("ciel_user") || localStorage.getItem("user");
                            fresh = raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
                        } catch {
                            fresh = null;
                        }
                        if (partnerNeedsMembershipPayment(fresh ?? user)) {
                            router.replace("/dashboard/partner/membership-payment");
                        }
                    })();
                }
                return;
            }
            if (pathname.startsWith("/dashboard/partner/organization")) return;
            const token = localStorage.getItem("ciel_token");
            const userId = user.id ?? user.userId ?? user.user_id;
            if (!token || userId == null || userId === "") {
                router.replace(PARTNER_COMPLETE_PROFILE_PATH);
                return;
            }
            void (async () => {
                try {
                    const res = await authenticatedFetch("/api/v1/organisation/profile/detail", {
                        method: "POST",
                        body: JSON.stringify({ userId }),
                    }, { redirectToLogin: false });
                    if (!res?.ok) {
                        router.replace(PARTNER_COMPLETE_PROFILE_PATH);
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
                        router.replace(PARTNER_COMPLETE_PROFILE_PATH);
                    }
                } catch {
                    router.replace(PARTNER_COMPLETE_PROFILE_PATH);
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
