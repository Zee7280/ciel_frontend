export const MEDIA_VISIBILITY_VALUES = ["public", "restricted", "private"] as const;

export type MediaVisibility = (typeof MEDIA_VISIBILITY_VALUES)[number];

export const DEFAULT_MEDIA_VISIBILITY: MediaVisibility = "restricted";

export const PUBLIC_EVIDENCE_LOCKED_LABEL =
    "🔒 Evidence verified — not publicly available";

const ALIASES: Record<string, MediaVisibility> = {
    public: "public",
    restricted: "restricted",
    limited: "restricted",
    institutional: "restricted",
    private: "private",
    internal: "private",
};

export const MEDIA_VISIBILITY_LABELS: Record<MediaVisibility, string> = {
    public: "Public",
    restricted: "Restricted",
    private: "Private",
};

export function normalizeMediaVisibility(value: unknown): MediaVisibility | "" {
    const key = String(value || "").trim().toLowerCase();
    return ALIASES[key] || "";
}

export function resolveMediaVisibility(value: unknown): MediaVisibility {
    return normalizeMediaVisibility(value) || DEFAULT_MEDIA_VISIBILITY;
}

export function isPublicMediaVisibility(value: unknown): boolean {
    return normalizeMediaVisibility(value) === "public";
}

export function hasPublicSharePermission(section8: unknown): boolean {
    if (!section8 || typeof section8 !== "object") return false;
    const row = section8 as Record<string, unknown>;
    if (row.public_share_permission === true) return true;
    const ethics =
        row.ethical_compliance && typeof row.ethical_compliance === "object"
            ? (row.ethical_compliance as Record<string, unknown>)
            : {};
    return (
        ethics.privacy_respected === true ||
        row.consent_informed === true ||
        row.consent_authentic === true
    );
}

export function mediaVisibilityTitle(value: unknown): string {
    const vis = normalizeMediaVisibility(value);
    return vis ? MEDIA_VISIBILITY_LABELS[vis] : "";
}

/** Canonicalize loaded/draft section8 so Restricted/Private aliases never leak into the wizard. */
export function hydrateSection8Visibility<T extends Record<string, unknown>>(section8: T): T {
    const vis = resolveMediaVisibility(section8.media_visible);
    return {
        ...section8,
        media_visible: vis,
        public_share_permission: vis === "public" ? hasPublicSharePermission(section8) : false,
    };
}
