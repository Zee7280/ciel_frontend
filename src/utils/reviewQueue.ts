/** Shared waiting-vs-approved buckets for faculty / admin / partner / university review lists. */

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

/** Who reviews after submit (and after the private-candidate fee, when that applies). */
export function communityReportReviewerName(
    row: { private_candidate?: boolean | null; review_route?: string | null } | null | undefined,
): "Faculty" | "CIEL PK" {
    return isPrivateCandidateReview(row ?? {}) ? "CIEL PK" : "Faculty";
}

export function communityReportSendCta(
    row: { private_candidate?: boolean | null; review_route?: string | null } | null | undefined,
): "Send to Faculty" | "Send to CIEL PK" {
    return isPrivateCandidateReview(row ?? {}) ? "Send to CIEL PK" : "Send to Faculty";
}

export function isCommunityReportRejected(row: CommunityReviewRow): boolean {
    return (
        REJECTED_KEYS.has(normalizeReviewStatus(row.faculty_status)) ||
        REJECTED_KEYS.has(normalizeReviewStatus(row.status)) ||
        REJECTED_KEYS.has(normalizeReviewStatus(row.admin_status))
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

/** Live deck: faculty already signed off, or the overall report is already verified. */
export function isCommunityReportOnLiveDeck(row: CommunityReviewRow): boolean {
    return isCommunityReportFacultyApproved(row) || isCommunityReportPipelineComplete(row);
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
 * backend `isCommunityAwardLiveReport`: faculty signed off or report verified.
 * Hours and reporting-fee “paid” stay in waiting until that sign-off.
 */
export function isFacultyCommunityLiveCard(row: CommunityReviewRow & { hours?: number }): boolean {
    if (isCommunityReportRejected(row)) return false;
    if (normalizeReviewStatus(row.status) === "draft") return false;
    return isCommunityReportOnLiveDeck(row);
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
