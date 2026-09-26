export function flashcardExportFilename(title: string): string {
    const slug = String(title || "community-engagement")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80);
    return `${slug || "community-engagement"}-ciel-pk-flash-card`;
}

export function resolveFlashcardShareUrl(
    verifyUrl: string | null | undefined,
    pageUrl: string,
): string {
    const raw = typeof verifyUrl === "string" ? verifyUrl.trim() : "";
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.startsWith("/") && pageUrl) {
        try {
            return new URL(raw, pageUrl).href;
        } catch {
            return raw;
        }
    }
    return raw || String(pageUrl || "").trim();
}

export function isShareAbort(error: unknown): boolean {
    if (!error || typeof error !== "object") return false;
    const name = "name" in error ? String((error as { name?: unknown }).name) : "";
    return name === "AbortError" || name === "NotAllowedError";
}
