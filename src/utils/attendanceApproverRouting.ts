export type AttendanceApproverType = "faculty" | "partner";

function str(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
}

function hasValue(value: unknown): boolean {
    if (value == null) return false;
    if (typeof value === "string") return value.trim().length > 0;
    return true;
}

/**
 * Attendance approval ownership is fixed when a student applies.
 * Partner-created opportunities go to partner review; every other/legacy shape
 * stays on the existing faculty path.
 */
export function resolveAttendanceApproverType(opportunity: Record<string, unknown> | null | undefined): AttendanceApproverType {
    if (!opportunity) return "faculty";

    const creatorRole = str(
        opportunity.created_by_role ??
            opportunity.creator_role ??
            opportunity.creator_type ??
            opportunity.creatorBucket ??
            opportunity.createdByRole ??
            opportunity.creatorRole,
    ).toLowerCase();
    const source = str(opportunity.source ?? opportunity.opportunity_source ?? opportunity.opportunitySource).toLowerCase();
    const ownerType = str(opportunity.owner_type ?? opportunity.ownerType ?? opportunity.created_by_type ?? opportunity.createdByType).toLowerCase();

    const explicitFacultyOrStudent =
        creatorRole.includes("faculty") ||
        creatorRole.includes("student") ||
        source.includes("faculty") ||
        source.includes("student") ||
        ownerType.includes("faculty") ||
        ownerType.includes("student");

    if (explicitFacultyOrStudent) return "faculty";

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
