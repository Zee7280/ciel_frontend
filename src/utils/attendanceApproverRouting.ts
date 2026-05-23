export type AttendanceApproverType = "faculty" | "partner";

/** Matches backend `addAttendanceLog` participation status gate. */
export const PARTICIPATION_STATUSES_ALLOWING_ATTENDANCE_LOG = [
    "approved",
    "verified",
    "accepted",
    "finalized",
] as const;

function str(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
}

function pickPartnerEmail(value: unknown): string | null {
    return typeof value === "string" && value.trim().includes("@") ? value.trim() : null;
}

/** Partner contact emails — matches backend `extractPartnerContactEmailsForAttendance`. */
export function extractPartnerContactEmailsForAttendance(
    opportunity: Record<string, unknown> | null | undefined,
): string[] {
    if (!opportunity) return [];
    const partnerOrg =
        opportunity.partner_organization && typeof opportunity.partner_organization === "object"
            ? (opportunity.partner_organization as Record<string, unknown>)
            : {};
    const externalCollab =
        opportunity.external_partner_collaboration &&
        typeof opportunity.external_partner_collaboration === "object"
            ? (opportunity.external_partner_collaboration as Record<string, unknown>)
            : {};
    const executingContext =
        opportunity.executing_context && typeof opportunity.executing_context === "object"
            ? (opportunity.executing_context as Record<string, unknown>)
            : {};
    const contextPartner =
        executingContext.partner && typeof executingContext.partner === "object"
            ? (executingContext.partner as Record<string, unknown>)
            : {};
    const supervision =
        opportunity.supervision && typeof opportunity.supervision === "object"
            ? (opportunity.supervision as Record<string, unknown>)
            : {};

    const raw = [
        pickPartnerEmail(partnerOrg.official_email),
        pickPartnerEmail(partnerOrg.officialEmail),
        pickPartnerEmail(partnerOrg.email),
        pickPartnerEmail(partnerOrg.contact_email),
        pickPartnerEmail(partnerOrg.contactEmail),
        pickPartnerEmail(supervision.partner_email),
        pickPartnerEmail(supervision.external_partner_email),
        pickPartnerEmail(externalCollab.official_email),
        pickPartnerEmail(externalCollab.officialEmail),
        pickPartnerEmail(contextPartner.official_email),
        pickPartnerEmail(contextPartner.officialEmail),
    ].filter((v): v is string => Boolean(v));

    return [...new Set(raw.map((e) => e.toLowerCase()))];
}

/**
 * True when the project has a partner contact email for attendance review (not host org id alone).
 * Backend ignores client `attendance_approver_type` and recomputes from the opportunity.
 */
export function opportunityHasPartner(opportunity: Record<string, unknown> | null | undefined): boolean {
    return extractPartnerContactEmailsForAttendance(opportunity).length > 0;
}

export function canLogAttendanceForParticipationStatus(status: string | null | undefined): boolean {
    const normalized = str(status).toLowerCase();
    if (!normalized) return false;
    return (PARTICIPATION_STATUSES_ALLOWING_ATTENDANCE_LOG as readonly string[]).includes(normalized);
}

/**
 * Attendance approval ownership is fixed when a student applies (backend recomputes on apply).
 * Partner-linked student projects route to partner review; faculty/student-only projects stay on faculty.
 */
export function resolveAttendanceApproverType(
    opportunity: Record<string, unknown> | null | undefined,
): AttendanceApproverType {
    return opportunityHasPartner(opportunity) ? "partner" : "faculty";
}
