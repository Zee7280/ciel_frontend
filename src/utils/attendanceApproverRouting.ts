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

function hasValue(value: unknown): boolean {
    if (value == null) return false;
    if (typeof value === "string") return value.trim().length > 0;
    return true;
}

function hasMeaningfulObjectValue(value: unknown): boolean {
    if (!value || typeof value !== "object") return false;
    return Object.values(value as Record<string, unknown>).some((v) => {
        if (Array.isArray(v)) return v.length > 0;
        if (v && typeof v === "object") return hasMeaningfulObjectValue(v);
        return v !== null && v !== undefined && String(v).trim() !== "";
    });
}

/**
 * Mirrors backend `StudentsService.opportunityHasPartner` — source of truth on apply.
 * Backend ignores client `attendance_approver_type` and recomputes from the opportunity.
 */
export function opportunityHasPartner(opportunity: Record<string, unknown> | null | undefined): boolean {
    if (!opportunity) return false;
    if (
        opportunity.requires_partner_approval === true ||
        opportunity.requiresPartnerApproval === true
    ) {
        return true;
    }
    if (hasValue(opportunity.organization_id) || hasValue(opportunity.organizationId)) {
        return true;
    }
    if (hasMeaningfulObjectValue(opportunity.partner_organization)) return true;
    if (hasMeaningfulObjectValue(opportunity.executing_organization)) return true;
    return false;
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
    if (!opportunity) return "faculty";

    if (opportunityHasPartner(opportunity)) {
        return "partner";
    }

    const creatorRole = str(
        opportunity.created_by_role ??
            opportunity.creator_role ??
            opportunity.creator_type ??
            opportunity.creatorBucket ??
            opportunity.createdByRole ??
            opportunity.creatorRole,
    ).toLowerCase();
    const source = str(opportunity.source ?? opportunity.opportunity_source ?? opportunity.opportunitySource).toLowerCase();
    const ownerType = str(
        opportunity.owner_type ?? opportunity.ownerType ?? opportunity.created_by_type ?? opportunity.createdByType,
    ).toLowerCase();

    const explicitPartner =
        creatorRole.includes("partner") ||
        creatorRole.includes("ngo") ||
        creatorRole.includes("organization") ||
        source.includes("partner") ||
        source.includes("ngo") ||
        ownerType.includes("partner") ||
        ownerType.includes("ngo") ||
        ownerType.includes("organization");

    if (explicitPartner) return "partner";

    const partnerLinked =
        hasValue(opportunity.partner_id) ||
        hasValue(opportunity.partnerId) ||
        hasValue(opportunity.partner_user_id) ||
        hasValue(opportunity.partnerUserId);

    return partnerLinked ? "partner" : "faculty";
}
