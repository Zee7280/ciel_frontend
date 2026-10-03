/**
 * Preset chip options used by the create-opportunity forms, shared with the "re-open a saved
 * opportunity" mappers so a custom ("Other") value can be split back out of the stored array.
 * Without this a saved custom skill / beneficiary / verification method reloads into the plain
 * chip array, becomes invisible, and can never be removed.
 */

export const OPPORTUNITY_BENEFICIARY_PRESETS = [
    "Children",
    "Youth",
    "Women",
    "Elderly",
    "Persons with disabilities",
    "Students",
    "Community members",
] as const;

/** Faculty + Partner/NGO/University forms. */
export const ORG_SKILL_PRESETS = [
    "Leadership",
    "Communication",
    "Teaching",
    "Teamwork",
    "Digital Skills",
    "Research",
    "Problem Solving",
] as const;

/** Faculty + Partner/NGO/University forms. */
export const ORG_VERIFICATION_PRESETS = [
    "Attendance sheets",
    "Supervisor sign-off",
    "Photos of activities",
    "Assessment sheets",
    "Digital logs",
] as const;

/** Student form. */
export const STUDENT_SKILL_PRESETS = [
    "Leadership",
    "Communication",
    "Teaching",
    "Teamwork",
    "Digital Skills",
    "Community Engagement",
    "Critical Thinking",
    "Problem Solving",
    "Time Management",
    "Project Management",
    "Research",
    "Documentation",
    "Financial Literacy",
    "Public Speaking",
    "Event Planning",
    "Media/Content Creation",
] as const;

export function strList(value: unknown): string[] {
    return Array.isArray(value)
        ? value.map((v) => (typeof v === "string" ? v : v == null ? "" : String(v))).map((v) => v.trim()).filter(Boolean)
        : [];
}

/** Splits a stored array into preset values and custom ("Other") values, preserving order. */
export function splitCustomValues(
    stored: unknown,
    presets: readonly string[],
): { known: string[]; custom: string[] } {
    const known: string[] = [];
    const custom: string[] = [];
    for (const v of strList(stored)) {
        if (/^other$/i.test(v)) continue; // a bare "Other" placeholder is not a value
        (presets.includes(v) ? known : custom).push(v);
    }
    return { known, custom };
}
