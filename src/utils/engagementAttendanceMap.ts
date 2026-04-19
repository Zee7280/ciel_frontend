/**
 * Normalize engagement attendance API rows (camelCase or snake_case) for tables + report context.
 */

export function normalizeEngagementAttendanceLog(
    e: Record<string, unknown>,
    options?: { participantPrefixedId?: string },
): Record<string, unknown> {
    const participantId =
        options?.participantPrefixedId ??
        (e.participantId != null ? String(e.participantId) : undefined);

    return {
        ...e,
        id: String(e.id ?? ""),
        date: (e.dateOfEngagement ?? e.date ?? "") as string,
        start_time: (e.startTime ?? e.start_time ?? "") as string,
        end_time: (e.endTime ?? e.end_time ?? "") as string,
        location: (e.organizationName ?? e.location ?? "") as string,
        activity_type: (e.activityType ?? e.activity_type ?? "") as string,
        description: (e.description ?? "") as string,
        hours: Number(e.sessionHours ?? e.hours ?? 0),
        participantId,
        evidence_file: e.evidenceUrl ?? (e.evidenceUploaded === true ? true : e.evidenceUploaded === "true" ? true : undefined),
        approval_status: (e.approval_status ?? e.approvalStatus ?? null) as string | null,
        assigned_approver_type: (e.assigned_approver_type ?? e.assignedApproverType ?? null) as string | null,
        assigned_approver_user_id: (e.assigned_approver_user_id ?? e.assignedApproverUserId ?? null) as string | null,
        opportunity_creator_kind: (e.opportunity_creator_kind ?? e.opportunityCreatorKind ?? null) as string | null,
    };
}
