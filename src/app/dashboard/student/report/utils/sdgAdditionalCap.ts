/**
 * V19 3.2 — "If you wish to align your project with additional SDGs, you may select up to two."
 * The cap counts every goal the student adds, however the form groups them: the secondary
 * alignments plus the student's own primary mapping when the opportunity already carries a
 * registered primary goal. Mirrors ciel_backend report-submit-validation.util.ts.
 */
export const MAX_ADDITIONAL_SDGS = 2;

type Section3Like = {
    primary_sdg?: { goal_number?: number | string | null } | null;
    secondary_sdgs?: unknown;
    registered_primary_goal?: number | string | null;
    registered_secondary_contributions?: Record<string, unknown> | null;
};

/** The student's 3.2 primary mapping is an *additional* goal only when the opportunity has its own. */
export function studentPrimaryIsAdditional(section3: Section3Like | null | undefined): boolean {
    const s = section3 || {};
    const goal = String(s.primary_sdg?.goal_number ?? "").trim();
    if (!goal) return false;
    const registeredPrimary = Number(s.registered_primary_goal);
    if (!(registeredPrimary >= 1)) return false;
    if (goal === String(registeredPrimary)) return false;
    const registered = s.registered_secondary_contributions && typeof s.registered_secondary_contributions === "object"
        ? s.registered_secondary_contributions
        : {};
    return !(goal in registered);
}

export function additionalStudentSdgCount(section3: Section3Like | null | undefined): number {
    const s = section3 || {};
    const secondaries = Array.isArray(s.secondary_sdgs) ? s.secondary_sdgs.length : 0;
    return secondaries + (studentPrimaryIsAdditional(s) ? 1 : 0);
}

/** How many secondary alignments 3.2.2 may still hold (never below 0). */
export function secondarySdgSlots(section3: Section3Like | null | undefined): number {
    return Math.max(0, MAX_ADDITIONAL_SDGS - (studentPrimaryIsAdditional(section3) ? 1 : 0));
}
