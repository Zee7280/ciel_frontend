/** Shared draft/under-review/revision/rejected/approved tone+label derivation — every path
 * (Coursework, FYP, Startup/Venture) gates the same way: submitted + a reviewer-set approval
 * status. One card/pill/badge helper for all three, so a status vocabulary tweak in one path
 * doesn't quietly drift from the others. */

export type PathReviewStatusTone = "draft" | "under_review" | "revision_requested" | "rejected" | "approved";

export function reviewStatusLabel(
    status: string | undefined,
    approvalStatus: string | null | undefined,
    revisionValue: string,
): { tone: PathReviewStatusTone; label: string } {
    if (status !== "submitted") return { tone: "draft", label: "Draft" };
    switch (approvalStatus) {
        case "approved":
            return { tone: "approved", label: "Approved" };
        case "rejected":
            return { tone: "rejected", label: "Rejected" };
        case revisionValue:
            return { tone: "revision_requested", label: "Revision requested" };
        default:
            return { tone: "under_review", label: "Under review" };
    }
}

export function fypStatusLabel(entry: { status?: string; supervisorApprovalStatus?: string | null }): { tone: PathReviewStatusTone; label: string } {
    return reviewStatusLabel(entry.status, entry.supervisorApprovalStatus, "revision_requested");
}

export function ventureStatusLabel(entry: { status?: string; reviewPipeline?: { supervisorStatus?: string | null } | null }): { tone: PathReviewStatusTone; label: string } {
    return reviewStatusLabel(entry.status, entry.reviewPipeline?.supervisorStatus, "revisions_requested");
}
