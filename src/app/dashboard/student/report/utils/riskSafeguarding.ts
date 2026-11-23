/**
 * Section 2.3 — "Risk, safeguarding & consent".
 *
 * Stored inside the existing `section2` JSON (no new table / column):
 *   risk_factors            string[]  chip ids below
 *   risk_mitigation         string    what the student did about it
 *   risk_consent            string    one of CONSENT_OPTIONS values ('' = not answered)
 *   risk_safeguarding_lead  string    "Name and role" of the on-site person
 *   risk_unresolved         string    anything flagged but not fully mitigated (optional)
 *
 * Reports saved before this block existed have none of these keys; every helper here treats a
 * missing value as "not answered" so those drafts and submitted reports stay valid.
 *
 * Keep the chip ids in sync with ciel_backend/src/reports/report-submit-validation.util.ts.
 */

export const RISK_NONE_ID = "none";

export const RISK_FACTOR_OPTIONS: ReadonlyArray<{ id: string; label: string }> = [
    { id: "children_present", label: "Children present" },
    { id: "physical_work", label: "Physical work / tools / heights" },
    { id: "beneficiary_photos", label: "Photos of beneficiaries" },
    { id: "personal_data", label: "Personal data collected" },
    { id: "health_contact", label: "Health or medical contact" },
    { id: "travel_to_site", label: "Travel to site" },
    { id: "handling_money", label: "Handling money" },
    { id: RISK_NONE_ID, label: "None identified" },
];

export const CONSENT_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
    { value: "written", label: "Written consent obtained" },
    { value: "verbal", label: "Verbal consent obtained" },
    { value: "not_obtained", label: "Not obtained" },
    { value: "not_applicable", label: "Not applicable" },
];

export const RISK_TEXT_LIMITS = { mitigation: 1000, lead: 200, unresolved: 1000 } as const;

export type RiskBlockShape = {
    risk_factors?: unknown;
    risk_mitigation?: unknown;
    risk_consent?: unknown;
    risk_safeguarding_lead?: unknown;
    risk_unresolved?: unknown;
};

function text(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
}

/** Chip ids as a clean string array (tolerates null / legacy / malformed values). */
export function riskFactorIds(value: unknown): string[] {
    return Array.isArray(value)
        ? value.filter((v): v is string => typeof v === "string" && v.trim() !== "")
        : [];
}

/** Selected chips that are an actual risk (everything except "None identified"). */
export function realRiskIds(value: unknown): string[] {
    return riskFactorIds(value).filter((id) => id !== RISK_NONE_ID);
}

/**
 * Toggle a chip. "None identified" is exclusive: picking it clears the rest, and picking any
 * real risk drops it — so the stored list can never say "children present" and "none" at once.
 */
export function toggleRiskFactor(current: unknown, id: string): string[] {
    const list = riskFactorIds(current);
    if (list.includes(id)) return list.filter((x) => x !== id);
    if (id === RISK_NONE_ID) return [RISK_NONE_ID];
    return [...list.filter((x) => x !== RISK_NONE_ID), id];
}

export function riskFactorLabel(id: string): string {
    return RISK_FACTOR_OPTIONS.find((o) => o.id === id)?.label ?? id;
}

export function consentLabel(value: unknown): string {
    const v = text(value);
    return CONSENT_OPTIONS.find((o) => o.value === v)?.label ?? v;
}

/**
 * V19 item 15 — the consent status is the student's own declaration. Nobody on the platform
 * checks the consent forms, so every reviewer-facing surface (faculty / admin / partner views,
 * print, impact package) must say so instead of presenting "Written consent obtained" as a fact.
 */
export const CONSENT_REPORTED_QUALIFIER = "student-reported, not independently verified";

export function consentReportedLabel(value: unknown): string {
    const label = consentLabel(value);
    return label ? `${label} (${CONSENT_REPORTED_QUALIFIER})` : label;
}

/** True when the student answered anything in this block (used to decide whether to render it read-only). */
export function hasRiskBlockContent(block: RiskBlockShape | null | undefined): boolean {
    if (!block) return false;
    return (
        riskFactorIds(block.risk_factors).length > 0 ||
        Boolean(text(block.risk_mitigation)) ||
        Boolean(text(block.risk_consent)) ||
        Boolean(text(block.risk_safeguarding_lead)) ||
        Boolean(text(block.risk_unresolved))
    );
}

function firstSentence(value: unknown, maxLen = 220): string {
    const t = text(value);
    if (!t) return "";
    const match = t.match(/^[^.!?]*[.!?]/);
    const candidate = (match ? match[0] : t).trim().replace(/[.!?]+$/, "");
    return candidate.length <= maxLen ? candidate : `${candidate.slice(0, maxLen).trim()}…`;
}

function listJoin(items: string[]): string {
    if (items.length < 2) return items.join("");
    return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/**
 * 2.3 as one or two plain sentences for the Section 2 baseline statement and summaries. Empty when
 * the block was not answered (older reports), so nothing is invented.
 */
export function safeguardingSummarySentence(block: RiskBlockShape | null | undefined): string {
    if (!hasRiskBlockContent(block)) return "";
    const risks = realRiskIds(block?.risk_factors).map((id) => riskFactorLabel(id).toLowerCase());
    const parts: string[] = [];
    if (!risks.length && riskFactorIds(block?.risk_factors).includes(RISK_NONE_ID)) {
        parts.push("Safeguarding: no risk factors were identified for this project.");
    } else if (risks.length) {
        const precaution = firstSentence(block?.risk_mitigation);
        parts.push(
            `Safeguarding: ${listJoin(risks)} ${risks.length === 1 ? "was" : "were"} identified as risk factors${precaution ? `; ${precaution.charAt(0).toLowerCase()}${precaution.slice(1)}` : ""}.`,
        );
    } else if (text(block?.risk_mitigation)) {
        parts.push(`Safeguarding: ${firstSentence(block?.risk_mitigation)}.`);
    }
    const consent = consentLabel(block?.risk_consent);
    if (consent) parts.push(`Consent for photographs and personal data: ${consent.toLowerCase()} (${CONSENT_REPORTED_QUALIFIER}).`);
    const lead = text(block?.risk_safeguarding_lead);
    if (lead) parts.push(`Responsible for safeguarding on site: ${lead.replace(/[.!?]+$/, "")}.`);
    const unresolved = firstSentence(block?.risk_unresolved);
    if (unresolved) parts.push(`Unresolved: ${unresolved}.`);
    return parts.join(" ");
}

/** Short banner line: "Safeguarding: 2 risk factors · written consent obtained (student-reported)". */
export function safeguardingBannerLine(block: RiskBlockShape | null | undefined): string {
    if (!hasRiskBlockContent(block)) return "Safeguarding block not answered yet.";
    const risks = realRiskIds(block?.risk_factors);
    const none = !risks.length && riskFactorIds(block?.risk_factors).includes(RISK_NONE_ID);
    const consent = consentLabel(block?.risk_consent);
    const bits = [
        none ? "no risk factors identified" : risks.length ? `${risks.length} risk factor${risks.length === 1 ? "" : "s"}` : "",
        consent ? `${consent.toLowerCase()} (student-reported)` : "",
        text(block?.risk_safeguarding_lead) ? "on-site lead named" : "",
        text(block?.risk_unresolved) ? "unresolved item noted" : "",
    ].filter(Boolean);
    return `Safeguarding: ${bits.join(" · ")}.`;
}

/**
 * Conditional rules, deliberately backward compatible:
 *  - nothing selected (an older report / not touched yet) → no errors, the block is optional;
 *  - only "None identified" → no errors;
 *  - at least one real risk → mitigation, consent and the on-site lead become required.
 */
export function riskBlockErrors(
    block: RiskBlockShape | null | undefined,
): Array<{ field: string; message: string }> {
    const errors: Array<{ field: string; message: string }> = [];
    if (!block || realRiskIds(block.risk_factors).length === 0) return errors;
    if (!text(block.risk_mitigation)) {
        errors.push({ field: "risk_mitigation", message: "Say what you did to manage the risks you selected" });
    }
    if (!text(block.risk_consent)) {
        errors.push({ field: "risk_consent", message: "Choose the consent status for photos and data" });
    }
    if (!text(block.risk_safeguarding_lead)) {
        errors.push({ field: "risk_safeguarding_lead", message: "Name the person responsible for safeguarding on site" });
    }
    return errors;
}

/**
 * V19 item 13 — reviewer attention notes for Section 2.3. Pure, side-effect free, and tolerant of
 * older reports: a blank block yields one "not completed" note instead of a crash. Rendered on the
 * faculty / partner / admin review surfaces and the print dossier; never shown as a submit error.
 * Keep in sync with ciel_backend/src/reports/safeguarding-review.util.ts.
 */
export type SafeguardingReviewNote = {
    level: "attention" | "info";
    code:
        | "block_blank"
        | "fields_missing"
        | "consent_not_obtained_sensitive"
        | "consent_not_applicable_sensitive"
        | "consent_missing_sensitive"
        | "none_but_details"
        | "unresolved_risks"
        | "consent_student_reported";
    message: string;
};

const SENSITIVE_RISK_IDS = new Set(["children_present", "beneficiary_photos", "personal_data", "health_contact"]);

export function safeguardingReviewNotes(block: RiskBlockShape | null | undefined): SafeguardingReviewNote[] {
    const notes: SafeguardingReviewNote[] = [];
    if (!hasRiskBlockContent(block)) {
        notes.push({
            level: "attention",
            code: "block_blank",
            message: "Risk, safeguarding & consent (2.3) was not completed by the student — a blank block is not evidence of \"no risk\".",
        });
        return notes;
    }
    const b = block as RiskBlockShape;
    const ids = riskFactorIds(b.risk_factors);
    const real = realRiskIds(b.risk_factors);
    const consent = text(b.risk_consent);
    const mitigation = text(b.risk_mitigation);
    const unresolved = text(b.risk_unresolved);
    const sensitive = real.filter((id) => SENSITIVE_RISK_IDS.has(id));
    const sensitiveLabels = sensitive.map(riskFactorLabel).join(", ");

    const missing = riskBlockErrors(b);
    if (missing.length) {
        notes.push({
            level: "attention",
            code: "fields_missing",
            message: `Risks were selected but the block is incomplete: ${missing.map((m) => m.message.toLowerCase()).join("; ")}.`,
        });
    }
    if (sensitive.length && consent === "not_obtained") {
        notes.push({
            level: "attention",
            code: "consent_not_obtained_sensitive",
            message: `Consent reported as not obtained although the work involved ${sensitiveLabels.toLowerCase()}. Check how photos / data were handled before accepting.`,
        });
    } else if (sensitive.length && consent === "not_applicable") {
        notes.push({
            level: "attention",
            code: "consent_not_applicable_sensitive",
            message: `Consent marked "not applicable" but the student also reported ${sensitiveLabels.toLowerCase()} — these answers conflict.`,
        });
    } else if (sensitive.length && !consent) {
        notes.push({
            level: "attention",
            code: "consent_missing_sensitive",
            message: `No consent status recorded although the work involved ${sensitiveLabels.toLowerCase()}.`,
        });
    }
    if (ids.includes(RISK_NONE_ID) && (mitigation || unresolved)) {
        notes.push({
            level: "attention",
            code: "none_but_details",
            message: "\"None identified\" is selected, yet mitigation or unresolved-risk text was entered — ask which answer is right.",
        });
    }
    if (unresolved) {
        notes.push({
            level: "attention",
            code: "unresolved_risks",
            message: `Unresolved risks reported by the student: ${unresolved.length > 180 ? `${unresolved.slice(0, 180).trim()}…` : unresolved}`,
        });
    }
    if (consent === "written" || consent === "verbal") {
        notes.push({
            level: "info",
            code: "consent_student_reported",
            message: `${consentLabel(consent)} is the student's own declaration (${CONSENT_REPORTED_QUALIFIER}); no consent form has been checked by the platform.`,
        });
    }
    return notes;
}
