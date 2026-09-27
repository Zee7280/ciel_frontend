import assert from "node:assert/strict";
import {
    communityReportReviewerName,
    communityReportSendCta,
    isCommunityReportAwaitingFee,
    isCommunityReportWaitingForFaculty,
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

assert.equal(communityReportReviewerName(uniSubmitted), "Faculty");
assert.equal(communityReportSendCta(uniSubmitted), "Send to Faculty");
assert.equal(communityReportReviewerName(privateFeeHold), "CIEL PK");
assert.equal(communityReportSendCta(privateFeeHold), "Send to CIEL PK");

console.log("reviewQueue student/faculty/admin buckets ok");
