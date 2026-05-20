"use client";

type StoredUser = Record<string, unknown>;

function safeParseStoredUser(raw: string | null): StoredUser | null {
    if (!raw) return null;
    try {
        return JSON.parse(raw) as StoredUser;
    } catch {
        return null;
    }
}

export function readStoredCurrentUser(): StoredUser | null {
    if (typeof window === "undefined") return null;
    return (
        safeParseStoredUser(window.localStorage.getItem("ciel_user")) ||
        safeParseStoredUser(window.localStorage.getItem("user"))
    );
}

export function normalizeEmail(value: unknown): string {
    return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function getStoredCurrentUserEmail(): string {
    const user = readStoredCurrentUser();
    if (!user) return "";
    return normalizeEmail(user.email ?? user.official_email ?? user.contact_email);
}

export function getStoredCurrentUserId(): string {
    const user = readStoredCurrentUser();
    if (!user) return "";

    const rawId = user.id ?? user.userId ?? user.partner_id ?? user.faculty_id;
    if (typeof rawId === "string") return rawId.trim();
    if (typeof rawId === "number") return String(rawId);
    return "";
}

/** For org-scoped dashboards (e.g. partner attendance on student-hosted but org-linked opportunities). */
export function getStoredOrganizationId(): string {
    const user = readStoredCurrentUser();
    if (!user) return "";
    const nested =
        user.organization && typeof user.organization === "object"
            ? (user.organization as { id?: unknown }).id
            : null;
    const raw = user.organizationId ?? user.organization_id ?? nested;
    if (typeof raw === "string") return raw.trim();
    if (typeof raw === "number") return String(raw);
    return "";
}
