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
