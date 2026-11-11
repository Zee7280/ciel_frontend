/**
 * Keeps each section's AI summary honest about the answers it was written from.
 *
 * When "Next" writes a section's AI summary, the wizard also stores `summary_source`: a short
 * fingerprint of the section's answers at that moment. The live banner compares it with the
 * current answers, so a summary written before later edits is shown as out of date instead of
 * being presented as what the rubric will read.
 */

/** Same aliases and default as `resolveMediaVisibility` in ./mediaVisibility (kept import-free for node tests). */
const VISIBILITY_ALIASES: Record<string, string> = {
    public: "public",
    restricted: "restricted",
    limited: "restricted",
    institutional: "restricted",
    private: "private",
    internal: "private",
};

function resolveMediaVisibility(value: unknown): string {
    return VISIBILITY_ALIASES[String(value || "").trim().toLowerCase()] || "restricted";
}

/** Wizard bookkeeping, file uploads and values the server rewrites on save: not part of the answers. */
const IGNORED_KEYS = new Set([
    "summary_text",
    "summary_source",
    "summary_text_generated",
    "media_usage",
    "public_share_permission",
    "evidence_files",
    "media_urls",
    "updated_at",
    "updatedAt",
]);

function isFileLike(value: unknown): boolean {
    if (typeof File !== "undefined" && value instanceof File) return true;
    return typeof value === "object" && value !== null && "name" in value && "size" in value && "type" in value;
}

/** Empty values are dropped and numbers compared as text, so a save round-trip does not look like an edit. */
function canonical(value: unknown): unknown {
    if (value == null || isFileLike(value)) return undefined;
    if (typeof value === "string") {
        const text = value.trim();
        return text ? text : undefined;
    }
    if (typeof value === "number") return Number.isFinite(value) ? String(value) : undefined;
    if (typeof value === "boolean") return value ? true : undefined;
    if (Array.isArray(value)) {
        const items = value.map(canonical).filter((item) => item !== undefined);
        return items.length ? items : undefined;
    }
    if (typeof value === "object") {
        const out: Record<string, unknown> = {};
        for (const key of Object.keys(value as Record<string, unknown>).sort()) {
            if (IGNORED_KEYS.has(key)) continue;
            const item = canonical((value as Record<string, unknown>)[key]);
            if (item !== undefined) out[key] = item;
        }
        return Object.keys(out).length ? out : undefined;
    }
    return undefined;
}

/** FNV-1a, 32 bit: short and stable; collisions only risk a missed "out of date" note. */
function hash(text: string): string {
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i += 1) {
        h ^= text.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(16).padStart(8, "0");
}

/** Fingerprint of a section's answers (the same answers the AI summary is written from). */
export function sectionSummarySource(section: unknown): string {
    let row = section;
    if (row && typeof row === "object" && !Array.isArray(row)) {
        const rec = row as Record<string, unknown>;
        if ("media_visible" in rec || "media_usage" in rec) {
            // The server stores the resolved visibility; compare the resolved value on both sides.
            row = { ...rec, media_visible: resolveMediaVisibility(rec.media_visible ?? rec.media_usage) };
        }
    }
    const json = JSON.stringify(canonical(row) ?? null);
    return `v1:${hash(json)}:${json.length}`;
}

/**
 * - `fresh`: written from exactly the current answers.
 * - `stale`: the answers changed after it was written.
 * - `unchecked`: saved before fingerprints existed, so it cannot be checked.
 * - `none`: no AI summary yet.
 */
export type SectionSummarySync = "fresh" | "stale" | "unchecked" | "none";

export function sectionSummarySync(section: unknown): SectionSummarySync {
    const rec = section && typeof section === "object" ? (section as Record<string, unknown>) : {};
    const text = typeof rec.summary_text === "string" ? rec.summary_text.trim() : "";
    if (!text) return "none";
    const source = typeof rec.summary_source === "string" ? rec.summary_source : "";
    if (!source) return "unchecked";
    return source === sectionSummarySource(section) ? "fresh" : "stale";
}

/** One state for a step built from several sections (Activities & Outputs = sections 4 + 5). */
export function combinedSummarySync(states: SectionSummarySync[]): SectionSummarySync {
    const present = states.filter((state) => state !== "none");
    if (!present.length) return "none";
    if (present.includes("stale")) return "stale";
    if (present.includes("unchecked")) return "unchecked";
    return "fresh";
}
