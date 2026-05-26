import { authenticatedFetch, isTokenValid } from "@/utils/api";

/** Dispatched on `window` when dashboard chrome learns the unread inbox count (all roles with notifications). */
export const CIEL_NOTIFICATIONS_UNREAD_EVENT = "ciel_notifications_unread" as const;

export type CielNotificationsUnreadEventDetail = {
    count: number;
};

export function roleHasNotificationInbox(role: string | null | undefined): boolean {
    const r = String(role ?? "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_");
    return (
        r === "student" ||
        r === "faculty" ||
        r === "admin" ||
        r === "partner" ||
        r === "ngo" ||
        r === "university" ||
        r === "corporate" ||
        r === "organization_admin"
    );
}

function persistNotificationsCountToStorage(count: number) {
    for (const key of ["ciel_user", "user"] as const) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        try {
            const parsed = JSON.parse(raw) as Record<string, unknown>;
            parsed.notifications_count = count;
            localStorage.setItem(key, JSON.stringify(parsed));
        } catch {
            /* ignore */
        }
    }
}

/** Updates sidebar + header badges (no network). */
export function broadcastUnreadNotificationsCount(count: number) {
    if (typeof window === "undefined") return;
    persistNotificationsCountToStorage(count);
    window.dispatchEvent(
        new CustomEvent<CielNotificationsUnreadEventDetail>(CIEL_NOTIFICATIONS_UNREAD_EVENT, {
            detail: { count },
        }),
    );
    window.dispatchEvent(new Event("ciel_user_updated"));
}

/**
 * Single network fetch for inbox unread count — call once after login.
 * Dashboard chrome reads `notifications_count` from localStorage + events thereafter.
 */
export async function fetchAndPersistUnreadNotificationsCount(): Promise<number | null> {
    if (typeof window === "undefined") return null;
    if (!isTokenValid(localStorage.getItem("ciel_token"))) return null;

    try {
        const res = await authenticatedFetch("/api/v1/notifications/unread-count", {}, { redirectToLogin: false });
        if (!res?.ok) return null;
        const data = (await res.json()) as { success?: boolean; data?: { count?: number } };
        if (data.success && typeof data.data?.count === "number") {
            broadcastUnreadNotificationsCount(data.data.count);
            return data.data.count;
        }
    } catch {
        /* non-fatal */
    }
    return null;
}
