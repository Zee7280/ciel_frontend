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
};

/** Submitted (or later) — not a student draft. */
export function isCommunityReportInFlight(row: CommunityReviewRow): boolean {
    return !isReviewDraftStatus(row.status);
}

export function isCommunityReportFacultyApproved(row: CommunityReviewRow): boolean {
    return SIGNED_OFF_KEYS.has(normalizeReviewStatus(row.faculty_status));
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

/** Faculty hub: waiting for *this* faculty click. */
export function isCommunityReportWaitingForFaculty(row: CommunityReviewRow): boolean {
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
    if (!isCommunityReportInFlight(row) || isCommunityReportRejected(row)) return false;
    return !isFacultyCommunityLiveCard(row);
}

/** Admin / national board live deck. Mirrors the backend's community-award eligibility gate
 * (isCommunityAwardMedalReport) — Faculty must have signed off in addition to Admin/overall,
 * otherwise a report can show up here without ever having a real CII score (backend excludes it
 * from award-cards, and the frontend used to fabricate a fake 0/100 card for it). */
export function isAdminCommunityLiveCard(row: CommunityReviewRow): boolean {
    if (isCommunityReportRejected(row)) return false;
    if (normalizeReviewStatus(row.status) === "draft") return false;
    if (!isCommunityReportFacultyApproved(row)) return false;
    return isCommunityReportAdminSignedOff(row);
}

export function isAdminCommunityWaiting(row: CommunityReviewRow): boolean {
    if (!isCommunityReportInFlight(row) || isCommunityReportRejected(row)) return false;
    return !isAdminCommunityLiveCard(row);
}

/** Admin / national board: still in pipeline, not a live faculty-approved card. */
export function isCommunityReportWaitingForAdmin(row: CommunityReviewRow): boolean {
    return isAdminCommunityWaiting(row);
}

/** Partner / university: submitted and not yet a live faculty-approved card. */
export function isCommunityReportWaitingForPartner(row: CommunityReviewRow): boolean {
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

export function isPathEntryWaiting(entry: PathReviewEntry): boolean {
    if (normalizeReviewStatus(entry.status) !== "submitted") return false;
    return !isReviewApprovedStatus(pathApprovalGate(entry));
}

export function isPathEntryApproved(entry: PathReviewEntry): boolean {
    if (normalizeReviewStatus(entry.status) !== "submitted") return false;
    return isReviewApprovedStatus(pathApprovalGate(entry));
}
