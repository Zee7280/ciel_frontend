/**
 * Human-readable message from a Nest/Next error body. Nest's ValidationPipe returns
 * `message: string[]` (one entry per failed rule); showing only the generic fallback — or just the
 * first entry — hides what the user actually has to fix.
 */
export function apiErrorMessage(body: unknown, fallback: string): string {
    if (!body || typeof body !== "object") return fallback;
    const rec = body as Record<string, unknown>;
    const pick = (m: unknown): string => {
        if (typeof m === "string") return m.trim();
        if (Array.isArray(m)) {
            return m
                .map((x) => (typeof x === "string" ? x.trim() : ""))
                .filter(Boolean)
                .join(" · ");
        }
        if (m && typeof m === "object") return pick((m as Record<string, unknown>).message);
        return "";
    };
    return pick(rec.message) || pick(rec.error) || fallback;
}
