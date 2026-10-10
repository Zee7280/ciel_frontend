import assert from "node:assert/strict";
import { isReportReturnedForRevision } from "./reportRevisionState";
import {
    COMMUNITY_REPORTS_IN_PROGRESS_HREF,
    COMMUNITY_REPORTS_UNDER_REVIEW_HREF,
    communityReportReviewerName,
    communityReportSendCta,
    isAdminCommunityLiveCard,
    isCommunityReportAwaitingFee,
    isCommunityReportOnLiveDeck,
    isCommunityReportRejected,
    isCommunityReportWaitingForFaculty,
    isFacultyCommunityLiveCard,
    isFacultyCommunityWaiting,
    isStudentReportAwaitingReview,
    reportRequiresReportingFee,
    studentReportPostSubmitHref,
} from "./reviewQueue";

assert.equal(reportRequiresReportingFee({ private_candidate: true }), true);
assert.equal(reportRequiresReportingFee({ review_route: "ciel_pk" }), true);
assert.equal(
    reportRequiresReportingFee({ review_route: "faculty" }),
    false,
    "university route must not open the fee gateway",
);

const uniSubmitted = { status: "submitted", faculty_status: "pending", review_route: "faculty" };
assert.equal(isCommunityReportAwaitingFee(uniSubmitted), false);
assert.equal(isCommunityReportWaitingForFaculty(uniSubmitted), true);

assert.equal(
    isCommunityReportWaitingForFaculty({
        status: "submitted",
        faculty_status: "not_applicable",
        review_route: "faculty",
    }),
    true,
    "faculty_status alone must not hide a university report from faculty",
);

const privateFeeHold = {
    status: "payment_pending",
    faculty_status: "not_applicable",
    private_candidate: true,
    review_route: "ciel_pk",
};
assert.equal(isCommunityReportAwaitingFee(privateFeeHold), true);
assert.equal(isCommunityReportWaitingForFaculty(privateFeeHold), false);

// CIEL PK Admin now owns Analyzer + CII lock for every Community Service report (faculty review is
// read-only) — the reviewer label is always "CIEL PK", regardless of review_route/private_candidate.
assert.equal(communityReportReviewerName(uniSubmitted), "CIEL PK");
assert.equal(communityReportSendCta(uniSubmitted), "Send to CIEL PK");
assert.equal(communityReportReviewerName(privateFeeHold), "CIEL PK");
assert.equal(communityReportSendCta(privateFeeHold), "Send to CIEL PK");

assert.equal(
    isStudentReportAwaitingReview({ status: "paid", is_editable: true }),
    false,
    "editable draft must not look submitted because of a leftover payment row",
);
assert.equal(isStudentReportAwaitingReview({ status: "submitted", is_editable: false }), true);
assert.equal(isStudentReportAwaitingReview({ status: "draft" }), false);

const facultyOnly = { status: "submitted", faculty_status: "approved", admin_status: "pending" };
const published = { status: "submitted", faculty_status: "approved", admin_status: "approved" };
assert.equal(isFacultyCommunityLiveCard(facultyOnly), false);
assert.equal(isCommunityReportOnLiveDeck(facultyOnly), false);
assert.equal(isFacultyCommunityWaiting(facultyOnly), true);
assert.equal(isFacultyCommunityLiveCard(published), true);
assert.equal(isAdminCommunityLiveCard(published), true);
assert.equal(isCommunityReportOnLiveDeck(published), true);

const adminRevision = {
    status: "revision",
    faculty_status: "approved",
    admin_status: "rejected",
};
assert.equal(
    isCommunityReportRejected(adminRevision),
    false,
    "admin request-revision must stay Action Required, not archive",
);
assert.equal(isReportReturnedForRevision(adminRevision), true);
assert.equal(isAdminCommunityLiveCard(adminRevision), false);
assert.equal(isCommunityReportOnLiveDeck(adminRevision), false);

const adminClosed = {
    status: "closed",
    faculty_status: "approved",
    admin_status: "approved",
};
assert.equal(isCommunityReportRejected(adminClosed), true, "closed reports belong in archive");
assert.equal(isReportReturnedForRevision(adminClosed), false);
assert.equal(isAdminCommunityLiveCard(adminClosed), false);
assert.equal(isCommunityReportOnLiveDeck(adminClosed), false);

assert.equal(
    COMMUNITY_REPORTS_UNDER_REVIEW_HREF,
    "/dashboard/student/paths/community-service?view=workspace&filter=review",
);
assert.equal(
    COMMUNITY_REPORTS_IN_PROGRESS_HREF,
    "/dashboard/student/paths/community-service?view=workspace&filter=reports",
);
assert.equal(
    studentReportPostSubmitHref({ feeRequired: false, projectId: "abc" }),
    COMMUNITY_REPORTS_UNDER_REVIEW_HREF,
    "university submit must land on Reports Under Review, not My Projects",
);
assert.equal(
    studentReportPostSubmitHref({ feeRequired: true, projectId: "abc" }),
    "/dashboard/student/payment?projectId=abc",
    "fee submit must still open payment",
);
assert.equal(
    studentReportPostSubmitHref({ feeRequired: true, projectId: "" }),
    COMMUNITY_REPORTS_IN_PROGRESS_HREF,
    "fee submit without project id must not send the student to My Projects",
);
assert.equal(COMMUNITY_REPORTS_UNDER_REVIEW_HREF.includes("view=create"), false);

console.log("reviewQueue student/faculty/admin buckets ok");
