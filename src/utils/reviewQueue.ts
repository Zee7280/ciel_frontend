/** Shared waiting-vs-approved buckets for faculty / admin / partner / university review lists. */

/** My Reports → Reports Under Review. Not My Projects, not opportunity `view=create`. */
export const COMMUNITY_REPORTS_UNDER_REVIEW_HREF =
    "/dashboard/student/paths/community-service?view=workspace&filter=review";

/** My Reports → Reports in Progress (fee due / payment proof waiting). */
export const COMMUNITY_REPORTS_IN_PROGRESS_HREF =
    "/dashboard/student/paths/community-service?view=workspace&filter=reports";

/** After a successful report submit: payment for fee reports, otherwise Reports Under Review. */
export function studentReportPostSubmitHref(args: {
    feeRequired: boolean;
    projectId?: string | null;
}): string {
    if (args.feeRequired) {
        const id = String(args.projectId || "").trim();
        return id
            ? `/dashboard/student/payment?projectId=${encodeURIComponent(id)}`
            : COMMUNITY_REPORTS_IN_PROGRESS_HREF;
    }
    return COMMUNITY_REPORTS_UNDER_REVIEW_HREF;
}


export function normalizeReviewStatus(value: unknown): string {
    return String(value ?? "")
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, "_");
}

const APPROVED_KEYS = new Set(["approved", "verified", "paid", "partner_verified"]);
const SIGNED_OFF_KEYS = new Set(["approved", "verified"]);
const REJECTED_KEYS = new Set(["rejected", "declined"]);
const DRAFT_KEYS = new Set(["", "draft", "continue", "none"]);

export function isReviewApprovedStatus(value: unknown): boolean {
    return APPROVED_KEYS.has(normalizeReviewStatus(value));
}

export function isReviewDraftStatus(value: unknown): boolean {
    return DRAFT_KEYS.has(normalizeReviewStatus(value));
}

export type CommunityReviewRow = {
    status?: string | null;
    faculty_status?: string | null;
    admin_status?: string | null;
    partner_status?: string | null;
    private_candidate?: boolean | null;
    review_route?: string | null;
};

/** Submitted (or later) — not a student draft. */
export function isCommunityReportInFlight(row: CommunityReviewRow): boolean {
    return !isReviewDraftStatus(row.status);
}

export function isCommunityReportFacultyApproved(row: CommunityReviewRow): boolean {
    return SIGNED_OFF_KEYS.has(normalizeReviewStatus(row.faculty_status));
}

function isPrivateCandidateReview(row: {
    private_candidate?: boolean | null;
    review_route?: string | null;
}): boolean {
    return row.private_candidate === true || row.review_route === "ciel_pk";
}

/** Who reviews after submit. Faculty login is read-only for report review now (CIEL PK Admin is
 * the sole approver for every report, private-candidate or not — see the "Faculty login is
 * read-only going forward" note in student-reports.service.ts `verifyReport`); kept taking `row`
 * for call-site compatibility even though both pathways now resolve the same way. */
export function communityReportReviewerName(
    row: { private_candidate?: boolean | null; review_route?: string | null } | null | undefined,
): "CIEL PK" {
    void (row ?? {});
    return "CIEL PK";
}

export function communityReportSendCta(
    row: { private_candidate?: boolean | null; review_route?: string | null } | null | undefined,
): "Send to CIEL PK" {
    void (row ?? {});
    return "Send to CIEL PK";
}

export function isCommunityReportRejected(row: CommunityReviewRow): boolean {
    const st = normalizeReviewStatus(row.status);
    // Admin "request revision" stores admin_status=rejected with status=revision.
    // That must stay Action Required (editable), not the archive.
    if (st === "revision" || st.includes("revision")) return false;
    if (st === "closed") return true;
    return (
        REJECTED_KEYS.has(normalizeReviewStatus(row.faculty_status)) ||
        REJECTED_KEYS.has(st)
    );
}

/** Report already finished the pipeline — do not keep it in a waiting inbox. */
export function isCommunityReportPipelineComplete(row: CommunityReviewRow): boolean {
    return SIGNED_OFF_KEYS.has(normalizeReviewStatus(row.status));
}

export function isCommunityReportAdminSignedOff(row: CommunityReviewRow): boolean {
    return (
        SIGNED_OFF_KEYS.has(normalizeReviewStatus(row.admin_status)) ||
        SIGNED_OFF_KEYS.has(normalizeReviewStatus(row.status))
    );
}

/** Live / Completed decks: the Admin-published package, not faculty sign-off alone. */
export function isCommunityReportOnLiveDeck(row: CommunityReviewRow): boolean {
    return isAdminCommunityLiveCard(row);
}

export function isCommunityReportFullyApproved(row: CommunityReviewRow): boolean {
    if (!isCommunityReportFacultyApproved(row)) return false;
    const admin = normalizeReviewStatus(row.admin_status);
    const overall = normalizeReviewStatus(row.status);
    return (
        isReviewApprovedStatus(admin) ||
        isReviewApprovedStatus(overall) ||
        overall === "verified" ||
        overall === "paid"
    );
}

function isWaitingReviewInbox(row: CommunityReviewRow): boolean {
    if (!isCommunityReportInFlight(row)) return false;
    if (isCommunityReportOnLiveDeck(row)) return false;
    if (isCommunityReportRejected(row)) return false;
    return true;
}

const REPORT_FEE_HOLD_KEYS = new Set([
    "pending_payment",
    "payment_pending",
    "payment_under_review",
]);

const STUDENT_SUBMITTED_REVIEW_KEYS = new Set([
    "submitted",
    "under_review",
    "payment_pending",
    "pending_payment",
    "payment_under_review",
    "paid",
    "approved",
    "verified",
    "partner_verified",
    "finalized",
]);

/**
 * Student wizard: only lock / show “waiting on review” after a real submit.
 * `is_editable: true` wins — a stray paid/submitted public status on a draft must not
 * skip Send or jump the student to the flash-card waiting state.
 */
export function isStudentReportAwaitingReview(row: {
    status?: string | null;
    report_status?: string | null;
    admin_status?: string | null;
    admin_approval_status?: string | null;
    is_editable?: boolean | null;
} | null | undefined): boolean {
    if (!row) return false;
    if (row.is_editable === true) return false;
    const st = normalizeReviewStatus(row.status);
    const rs = normalizeReviewStatus(row.report_status);
    const admin = normalizeReviewStatus(row.admin_status ?? row.admin_approval_status);
    if (["verified", "approved"].includes(st) || ["verified", "approved"].includes(admin)) {
        return true;
    }
    if (STUDENT_SUBMITTED_REVIEW_KEYS.has(st)) return true;
    return ["pending_payment", "payment_under_review", "paid"].includes(rs);
}

/** Private-candidate reports still pay after submit. University fee is paused (Dr Moeed). */
export function reportRequiresReportingFee(row: {
    private_candidate?: boolean | null;
    review_route?: string | null;
} | null | undefined): boolean {
    return isPrivateCandidateReview(row ?? {});
}

/** Faculty / admin must not see a private-candidate report until the fee is cleared. */
export function isCommunityReportAwaitingFee(row: CommunityReviewRow): boolean {
    if (!reportRequiresReportingFee(row)) return false;
    return REPORT_FEE_HOLD_KEYS.has(normalizeReviewStatus(row.status));
}

/** Faculty hub: waiting for *this* faculty click. */
export function isCommunityReportWaitingForFaculty(row: CommunityReviewRow): boolean {
    if (isPrivateCandidateReview(row)) return false;
    if (isCommunityReportAwaitingFee(row)) return false;
    return isWaitingReviewInbox(row);
}

/**
 * Faculty / admin / partner Community Service live deck — keep in lockstep with
 * backend `isCommunityAwardMedalReport`: Admin must have published (faculty signed
 * off as well, except private-candidate). Hours and reporting-fee “paid” stay in
 * waiting until that publish.
 */
export function isFacultyCommunityLiveCard(row: CommunityReviewRow & { hours?: number }): boolean {
    return isAdminCommunityLiveCard(row);
}

export function isFacultyCommunityWaiting(row: CommunityReviewRow & { hours?: number }): boolean {
    if (isPrivateCandidateReview(row)) return false;
    if (!isCommunityReportInFlight(row) || isCommunityReportRejected(row)) return false;
    if (isCommunityReportAwaitingFee(row)) return false;
    return !isFacultyCommunityLiveCard(row);
}

/** Admin / national board live deck. Mirrors the backend's community-award eligibility gate
 * (isCommunityAwardMedalReport) — Faculty must have signed off in addition to Admin/overall,
 * otherwise a report can show up here without ever having a real CII score (backend excludes it
 * from award-cards, and the frontend used to fabricate a fake 0/100 card for it). */
export function isAdminCommunityLiveCard(row: CommunityReviewRow): boolean {
    if (isCommunityReportRejected(row)) return false;
    if (normalizeReviewStatus(row.status) === "draft") return false;
    if (isPrivateCandidateReview(row)) return isCommunityReportAdminSignedOff(row);
    if (!isCommunityReportFacultyApproved(row)) return false;
    return isCommunityReportAdminSignedOff(row);
}

export function isAdminCommunityWaiting(row: CommunityReviewRow): boolean {
    if (!isCommunityReportInFlight(row) || isCommunityReportRejected(row)) return false;
    if (isCommunityReportAwaitingFee(row)) return false;
    return !isAdminCommunityLiveCard(row);
}

/** Admin "Pending review": in flight, admin has not signed off, not rejected. Does NOT require
 * faculty approval, so reports still with faculty are counted rather than silently dropped. */
export function isAdminCommunityPendingReview(row: CommunityReviewRow): boolean {
    if (!isCommunityReportInFlight(row) || isCommunityReportRejected(row)) return false;
    if (isCommunityReportAwaitingFee(row)) return false;
    return !isCommunityReportAdminSignedOff(row);
}

/** Admin / national board: still in pipeline, not a live faculty-approved card. */
export function isCommunityReportWaitingForAdmin(row: CommunityReviewRow): boolean {
    return isAdminCommunityWaiting(row);
}

/** Partner / university: submitted and not yet a live faculty-approved card. */
export function isCommunityReportWaitingForPartner(row: CommunityReviewRow): boolean {
    if (isCommunityReportAwaitingFee(row)) return false;
    return isWaitingReviewInbox(row);
}

export type PathReviewEntry = {
    status?: string | null;
    facultyApprovalStatus?: string | null;
    supervisorApprovalStatus?: string | null;
    reviewPipeline?: { supervisorStatus?: string | null } | null;
};

function pathApprovalGate(entry: PathReviewEntry): string | null | undefined {
    return entry.facultyApprovalStatus ?? entry.supervisorApprovalStatus ?? entry.reviewPipeline?.supervisorStatus;
}

/** Once faculty/supervisor has rejected or sent something back for revision, the ball is with the
 * student again — it must not keep inflating the "waiting for my review" queue/badge forever. */
const PATH_RETURNED_TO_STUDENT_KEYS = new Set([
    "rejected",
    "declined",
    "revision_requested",
    "revisions_requested",
    "changes_requested",
]);

export function isPathEntryWaiting(entry: PathReviewEntry): boolean {
    if (normalizeReviewStatus(entry.status) !== "submitted") return false;
    const gate = pathApprovalGate(entry);
    if (isReviewApprovedStatus(gate)) return false;
    if (PATH_RETURNED_TO_STUDENT_KEYS.has(normalizeReviewStatus(gate))) return false;
    return true;
}

export function isPathEntryApproved(entry: PathReviewEntry): boolean {
    if (normalizeReviewStatus(entry.status) !== "submitted") return false;
    return isReviewApprovedStatus(pathApprovalGate(entry));
}
