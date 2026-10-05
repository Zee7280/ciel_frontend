import assert from "node:assert/strict";
import {
    communityReportReviewerName,
    communityReportSendCta,
    isCommunityReportAwaitingFee,
    isCommunityReportWaitingForFaculty,
    isStudentReportAwaitingReview,
    reportRequiresReportingFee,
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

console.log("reviewQueue student/faculty/admin buckets ok");
