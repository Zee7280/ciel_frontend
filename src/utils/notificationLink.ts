/**
 * The dashboard path an in-app notification opens. The backend stores `link` as a same-origin
 * path; older rows may carry it under `url` / `target` or inside a data bag. Only relative paths
 * are ever linkable (never javascript: or external URLs).
 */
export type LinkableNotification = {
    link?: string | null;
    url?: string | null;
    target?: string | null;
    data?: unknown;
    payload?: unknown;
    metadata?: unknown;
};

export function safeNotificationPath(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const v = value.trim();
    return v.startsWith("/") && !v.startsWith("//") ? v : null;
}

export function relatedLink(n: LinkableNotification | null | undefined): string | null {
    if (!n) return null;
    const direct = safeNotificationPath(n.link) ?? safeNotificationPath(n.url) ?? safeNotificationPath(n.target);
    if (direct) return direct;
    for (const bag of [n.data, n.payload, n.metadata]) {
        if (bag && typeof bag === "object") {
            const o = bag as Record<string, unknown>;
            const found =
                safeNotificationPath(o.link) ?? safeNotificationPath(o.url) ?? safeNotificationPath(o.target) ?? safeNotificationPath(o.href);
            if (found) return found;
        }
    }
    return null;
}
