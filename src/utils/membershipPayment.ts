import { authenticatedFetch } from "@/utils/api";

/** Call after localStorage `ciel_user` / `user` is updated so Sidebar/header can re-read flags. */
export function notifyCielUserUpdated(): void {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new Event("ciel_user_updated"));
}

/** True when university/corporate account must pay membership before partner tools unlock. */
export function partnerNeedsMembershipPayment(user: Record<string, unknown> | null | undefined): boolean {
    if (!user) return false;
    if (user.requires_membership_payment === true) return true;
    const st = String(user.account_status ?? "").trim().toLowerCase();
    return st === "pending_membership_payment";
}

const MEMBERSHIP_ALLOWED_PREFIXES = ["/dashboard/partner/membership-payment", "/dashboard/partner/organization"] as const;

export function partnerPathAllowedDuringMembershipPending(pathname: string): boolean {
    return MEMBERSHIP_ALLOWED_PREFIXES.some(
        (p) => pathname === p || pathname.startsWith(`${p}/`),
    );
}

/** Merge `/user/me` profile into `ciel_user` / `user` in localStorage (membership flags, etc.). */
export async function refreshStoredUserFromMeApi(): Promise<boolean> {
    try {
        const res = await authenticatedFetch("/api/v1/users/me", {}, { redirectToLogin: false });
        if (!res?.ok) return false;
        const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
        if (!json || json.success !== true) return false;
        const data = json.data as Record<string, unknown> | undefined;
        if (!data || typeof data !== "object") return false;

        const raw = typeof window !== "undefined" ? localStorage.getItem("ciel_user") || localStorage.getItem("user") : null;
        let prev: Record<string, unknown> = {};
        try {
            if (raw) prev = JSON.parse(raw) as Record<string, unknown>;
        } catch {
            prev = {};
        }
        const merged: Record<string, unknown> = { ...prev, ...data };
        const s = JSON.stringify(merged);
        localStorage.setItem("ciel_user", s);
        localStorage.setItem("user", s);
        notifyCielUserUpdated();
        return true;
    } catch {
        return false;
    }
}
