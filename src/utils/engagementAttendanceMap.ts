/**
 * Normalize engagement attendance API rows (camelCase or snake_case) for tables + report context.
 */

function firstNonEmptyString(obj: Record<string, unknown>, keys: readonly string[]): string | null {
    for (const k of keys) {
        const v = obj[k];
        if (typeof v === "string" && v.trim()) return v.trim();
    }
    return null;
}

/**
 * Reject/flag note from CIEL backend: PATCH body uses `reason`; persisted/returned as
 * `approvalActionReason` (camelCase) on attendance entities. Also checks older/alternate keys.
 */
function pickApprovalRemark(e: Record<string, unknown>): string | null {
    return firstNonEmptyString(e, [
        "approvalActionReason",
        "approval_action_reason",
        "approval_remark",
        "approvalRemark",
        "rejection_reason",
        "rejectionReason",
        "rejection_remarks",
        "rejectionRemarks",
        "reject_reason",
        "rejectReason",
        "reviewer_notes",
        "reviewerNotes",
        "review_notes",
        "reviewNotes",
        "partner_remarks",
        "partnerRemarks",
        "faculty_remarks",
        "facultyRemarks",
        "approver_notes",
        "approverNotes",
        "reason",
        "remarks",
        "remark",
    ]);
}

function pickEvidenceUrlString(e: Record<string, unknown>): string | undefined {
    for (const k of ["evidenceUrl", "evidence_url", "fileUrl", "file_url", "attachmentUrl", "attachment_url"]) {
        const v = e[k];
        if (typeof v === "string" && v.trim()) return v.trim();
    }
    return undefined;
}

export function normalizeEngagementAttendanceLog(
    e: Record<string, unknown>,
    options?: { participantPrefixedId?: string },
): Record<string, unknown> {
    const participantId =
        options?.participantPrefixedId ??
        (e.participantId != null
            ? String(e.participantId)
            : e.participant_id != null
              ? String(e.participant_id)
              : undefined);

    const approval_remark = pickApprovalRemark(e);
    const evidenceUrlStr = pickEvidenceUrlString(e);
    const evidenceUploaded =
        e.evidenceUploaded === true || e.evidenceUploaded === "true" || e.evidence_uploaded === true;

    return {
        ...e,
        id: String(e.id ?? ""),
        date: (e.dateOfEngagement ?? e.date ?? "") as string,
        start_time: (e.startTime ?? e.start_time ?? "") as string,
        end_time: (e.endTime ?? e.end_time ?? "") as string,
        location: (e.organizationName ?? e.location ?? "") as string,
        location_pin: (e.locationPin ?? e.location_pin ?? "") as string,
        activity_type: (e.activityType ?? e.activity_type ?? "") as string,
        description: (e.description ?? "") as string,
        hours: Number(e.sessionHours ?? e.hours ?? 0),
        participantId,
        evidence_file:
            evidenceUrlStr ?? (evidenceUploaded ? true : undefined),
        approval_status: (e.approval_status ?? e.approvalStatus ?? null) as string | null,
        approval_remark,
        assigned_approver_type: (e.assigned_approver_type ?? e.assignedApproverType ?? null) as string | null,
        assigned_approver_user_id: (e.assigned_approver_user_id ?? e.assignedApproverUserId ?? null) as string | null,
        opportunity_creator_kind: (e.opportunity_creator_kind ?? e.opportunityCreatorKind ?? null) as string | null,
    };
}
