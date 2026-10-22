function lower(value: unknown): string {
    return String(value ?? "")
        .trim()
        .toLowerCase();
}

function idOf(value: unknown): string {
    if (typeof value === "string") return value.trim();
    if (typeof value === "number") return String(value);
    return "";
}

/**
 * Whether a row from `/opportunities?partner_id=me` was created by this partner (vs. a student or
 * faculty opportunity that only names the organization). Every partner page must agree on this, or
 * the dashboard counts drift from My Opportunities.
 */
export function isOwnedByCurrentPartner(
    record: Record<string, unknown>,
    currentUserId: string,
    currentOrgId = "",
): boolean {
    const role = lower(record.created_by_role ?? record.creator_role);
    if (
        record.isStudentCreated === true ||
        record.is_student_created === true ||
        role === "student" ||
        lower(record.source) === "student_created"
    ) {
        return false;
    }
    if (role === "partner") return true;

    const creatorId = idOf(record.creatorId ?? record.creator_id ?? record.created_by ?? record.owner_id);
    if (creatorId) return Boolean(currentUserId) && creatorId === currentUserId;

    // Older partner rows were saved without a creator; they belong to whichever org owns them.
    const orgId = idOf(record.organizationId ?? record.organization_id);
    if (orgId && currentOrgId) return orgId === currentOrgId;
    return true;
}
