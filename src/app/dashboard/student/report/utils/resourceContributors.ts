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

/* ─────────────────────────────────────────────────────────────────────────────
 * V21 Section 5 · one box per resource, three steps (the resource · who contributed it · proof).
 * The stored row is unchanged: `sources` still carries the student team and/or the contributor's
 * type, `verification` the kind of proof. `contributed_by` only remembers the answer to
 * "Who contributed it?" — when it is missing (older drafts) it is derived from the sources.
 * ───────────────────────────────────────────────────────────────────────────── */

export type ResourceContributedBy = "team" | "outside" | "both" | "";

/** "Who are they?" — the same values the shared source library already stores, in a friendlier order. */
export const PERSON_CONTRIBUTOR_TYPES = ["Individual Donor", "Private Sponsor", "Pro-bono Contributor", "Community Members / Beneficiaries"] as const;
export const ORG_CONTRIBUTOR_TYPES = [
    "Partner Organization", "Corporate / CSR", "NGO / Nonprofit / Civil Society", "University / Institution",
    "Faculty / Department / School", "Government / Public Agency", "Foundation / Philanthropy",
    "International / Multilateral Organization", "Research / Academic Grant",
] as const;
export const GROUP_CONTRIBUTOR_TYPES = ["Fundraising Event / Campaign", "Crowdfunding"] as const;
export const OTHER_CONTRIBUTOR_TYPE = "Other / Custom Source";
export const OTHER_CONTRIBUTOR_TYPES = ["In-kind Donation", OTHER_CONTRIBUTOR_TYPE] as const;
/** Always individuals; a sponsor, a collection or "something else" counts as an organisation once one is named. */
export const STRICT_PERSON_CONTRIBUTOR_TYPES = ["Individual Donor", "Pro-bono Contributor", "Community Members / Beneficiaries"] as const;

export const CONTRIBUTOR_TYPE_GROUPS: Array<[string, readonly string[]]> = [
    ["A person", PERSON_CONTRIBUTOR_TYPES],
    ["An organisation", ORG_CONTRIBUTOR_TYPES],
    ["A collection from many people", GROUP_CONTRIBUTOR_TYPES],
    ["Something else", OTHER_CONTRIBUTOR_TYPES],
];

const isInternalSource = (s: string) => (INTERNAL_RESOURCE_SOURCES as readonly string[]).includes(s);

function sourceList(sources: unknown): string[] {
    return Array.isArray(sources) ? sources.map((s) => String(s || "").trim()).filter(Boolean) : [];
}

/** The outside contributor's type = the first source that is not the student team ("" when none). */
export function contributorTypeOf(row: { sources?: unknown }): string {
    return sourceList(row.sources).find((s) => !isInternalSource(s)) || "";
}

/** Sources recorded earlier that are neither the team nor the contributor's type (older multi-chip rows). */
export function extraContributorSources(row: { sources?: unknown }): string[] {
    const type = contributorTypeOf(row);
    return sourceList(row.sources).filter((s) => !isInternalSource(s) && s !== type);
}

/** What the sources say about who contributed — used when the answer was never stored. */
export function contributedByFromSources(sources: unknown): ResourceContributedBy {
    const list = sourceList(sources);
    const self = list.some(isInternalSource);
    const ext = list.some((s) => !isInternalSource(s));
    return ext && self ? "both" : ext ? "outside" : self ? "team" : "";
}

/** The answer to "Who contributed it?" — the stored answer when it still fits the sources, else derived. */
export function resourceContributedBy(row: { contributed_by?: unknown; sources?: unknown }): ResourceContributedBy {
    const stored = String(row.contributed_by || "") as ResourceContributedBy;
    const list = sourceList(row.sources);
    const self = list.some(isInternalSource);
    const ext = list.some((s) => !isInternalSource(s));
    const fits =
        stored === "team" ? self && !ext
            : stored === "outside" ? !self
                : stored === "both" ? self
                    : stored === "" ? !self && !ext
                        : false;
    return fits ? stored : contributedByFromSources(list);
}

export function isOutsideContribution(row: { contributed_by?: unknown; sources?: unknown }): boolean {
    const who = resourceContributedBy(row);
    return who === "outside" || who === "both";
}

/** The stored sources follow the answers: the team (if it contributed) plus the contributor's type. */
export function sourcesForContribution(who: ResourceContributedBy, type: string, extras: string[] = [], current: unknown = []): string[] {
    const list = sourceList(current);
    const self = list.filter(isInternalSource);
    const team = who === "team" || who === "both" ? (self.length ? self : ["Student Team"]) : [];
    const outside = who === "outside" || who === "both" ? [type, ...extras].map((s) => s.trim()).filter(Boolean) : [];
    return [...new Set([...team, ...outside])];
}

export type ContributorKind = "individual" | "organization";

/** An organisation type, or any typed contributor that named an organisation, is an organization record. */
export function contributorKindOf(row: { sources?: unknown; contributor_org?: unknown }): ContributorKind {
    const type = contributorTypeOf(row);
    if ((ORG_CONTRIBUTOR_TYPES as readonly string[]).includes(type)) return "organization";
    if ((STRICT_PERSON_CONTRIBUTOR_TYPES as readonly string[]).includes(type)) return "individual";
    return type && String(row.contributor_org || "").trim() ? "organization" : "individual";
}

export function contributorOrgRequired(row: { sources?: unknown }): boolean {
    return (ORG_CONTRIBUTOR_TYPES as readonly string[]).includes(contributorTypeOf(row));
}

/** The organisation field is shown unless the contributor is strictly a person. */
export function contributorOrgShown(row: { sources?: unknown; contributor_org?: unknown }): boolean {
    const type = contributorTypeOf(row);
    if (contributorKindOf(row) === "organization" || String(row.contributor_org || "").trim()) return true;
    return Boolean(type) && !(STRICT_PERSON_CONTRIBUTOR_TYPES as readonly string[]).includes(type);
}

/** Name shown for a contributor: the organisation when it is one, otherwise the person. */
export function contributorDisplayName(row: { sources?: unknown; contributor_name?: unknown; contributor_org?: unknown }): string {
    const name = String(row.contributor_name || "").trim();
    const org = String(row.contributor_org || "").trim();
    return contributorKindOf(row) === "organization" ? org || "Organization name pending" : name || "Contributor name pending";
}

/** Two rows describe the same contributor when the email matches, or (no email) the organisation / name does. */
export function contributorIdentity(row: { sources?: unknown; contributor_name?: unknown; contributor_org?: unknown; contributor_email?: unknown }): string {
    const email = String(row.contributor_email || "").trim().toLowerCase();
    if (email) return `email|${email}`;
    const kind = contributorKindOf(row);
    const label = String(kind === "organization" ? row.contributor_org : row.contributor_name || "").trim().toLowerCase().replace(/\s+/g, " ");
    return label ? `${kind}|${label}` : "";
}

export function contributorIsNamed(row: { contributor_name?: unknown; contributor_org?: unknown; contributor_email?: unknown; contributor_phone?: unknown }): boolean {
    return ["contributor_name", "contributor_org", "contributor_email", "contributor_phone"].some((key) => String((row as Record<string, unknown>)[key] || "").trim());
}
