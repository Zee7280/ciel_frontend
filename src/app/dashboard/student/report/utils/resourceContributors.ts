/**
 * Section 5 (Resources) accountability rule, shared by the form and the submit validation.
 * A resource that came from outside the student team (a donor, sponsor, partner, NGO, university,
 * government, community, crowdfunding …) needs a named contributor, a way to reach them, a PKR
 * value and an evidence trail. The team's own time / self-funded items only need the PKR value
 * when they are cash.
 */
export const INTERNAL_RESOURCE_SOURCES = ["Student Team", "Self-funded"] as const;

export function isExternalResourceSource(sources: unknown): boolean {
    const list = Array.isArray(sources) ? sources.map((s) => String(s || "").trim()).filter(Boolean) : [];
    return list.some((s) => !(INTERNAL_RESOURCE_SOURCES as readonly string[]).includes(s));
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

/** Numeric PKR value from "5,000" / "PKR 5000"; NaN when not a number. */
export function parsePkrValue(value: unknown): number {
    const cleaned = String(value ?? "").replace(/[^\d.]/g, "");
    return cleaned ? Number(cleaned) : NaN;
}
