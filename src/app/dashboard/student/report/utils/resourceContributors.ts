/**
 * Section 5 (Resources) accountability rule, shared by the form and the submit validation.
 * A resource that came from outside the student team (a donor, sponsor, partner, NGO, university,
 * government, community, crowdfunding …) needs a named contributor, a way to reach them and an
 * evidence trail. The amount / quantity + unit on the entry already carries its value.
 */
export const INTERNAL_RESOURCE_SOURCES = ["Student Team", "Self-funded"] as const;

export function isExternalResourceSource(sources: unknown): boolean {
    const list = Array.isArray(sources) ? sources.map((s) => String(s || "").trim()).filter(Boolean) : [];
    return list.some((s) => !(INTERNAL_RESOURCE_SOURCES as readonly string[]).includes(s));
}

/** V19 5.2 "mixed" source — the student team AND an outside contributor funded the same entry. */
export function isMixedResourceSource(sources: unknown): boolean {
    const list = Array.isArray(sources) ? sources.map((s) => String(s || "").trim()).filter(Boolean) : [];
    const internal = (s: string) => (INTERNAL_RESOURCE_SOURCES as readonly string[]).includes(s);
    return list.some(internal) && list.some((s) => !internal(s));
}

/** "8,000" / 8000 → 8000; null when blank or not a number (older rows may hold free text). */
export function resourceAmountNumber(value: unknown): number | null {
    const text = String(value ?? "").replace(/,/g, "").trim();
    if (!text) return null;
    const n = Number(text);
    return Number.isFinite(n) ? n : null;
}

/** The outside contributor's share of a mixed entry: total minus the student team's share (null until both parse). */
export function contributorShareOf(row: { amount?: unknown; student_team_share?: unknown; sources?: unknown }): number | null {
    if (!isMixedResourceSource(row.sources)) return resourceAmountNumber(row.amount);
    const total = resourceAmountNumber(row.amount);
    const share = resourceAmountNumber(row.student_team_share);
    if (total === null || share === null || share < 0 || share > total) return null;
    return Number((total - share).toFixed(6));
}

/** `+92 300 1234567` → `+923001234567`; "" when nothing usable. */
export function normalizeContributorPhone(code: unknown, number: unknown): string {
    const digits = String(number ?? "").replace(/\D/g, "").replace(/^0+/, "");
    if (!digits) return "";
    // The country code is mandatory ("mobile number with country code").
    const cc = String(code ?? "").replace(/\D/g, "");
    if (!cc) return "";
    return `+${cc}${digits}`;
}

/** A contributor mobile number must carry a country code and 8–15 digits in total. */
export function contributorPhoneLooksValid(code: unknown, number: unknown): boolean {
    const full = normalizeContributorPhone(code, number);
    return /^\+\d{8,15}$/.test(full);
}

export function contributorEmailLooksValid(email: unknown): boolean {
    const e = String(email ?? "").trim();
    return !e || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}
