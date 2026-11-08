import assert from "node:assert/strict";
import test from "node:test";
import {
    countReportQueues,
    isReportAdminVerified,
    reportBadgeKey,
    reportMatchesTab,
    type ReportQueueTab,
} from "./adminReportQueue";

const TABS: ReportQueueTab[] = ["pending", "submitted", "verified", "rejected", "all"];
const tabsOf = (r: Parameters<typeof reportMatchesTab>[0]) => TABS.filter((t) => reportMatchesTab(r, t));

test("a submitted report waits in Needs review + Submitted", () => {
    assert.deepEqual(tabsOf({ status: "submitted", admin_status: "pending" }), ["pending", "submitted", "all"]);
});

test("a published report is Verified only", () => {
    assert.deepEqual(tabsOf({ status: "verified", admin_status: "approved" }), ["verified", "all"]);
    assert.equal(isReportAdminVerified({ status: "paid", admin_status: "pending" }), true);
});

test("a closed report is history: All only, never Verified or Needs review", () => {
    const closed = { status: "closed", admin_status: "approved" };
    assert.deepEqual(tabsOf(closed), ["all"]);
    assert.equal(isReportAdminVerified(closed), false);
    assert.equal(reportBadgeKey(closed), "closed");
});

test("sent back for revision reads Revision, including legacy rows whose status still says submitted", () => {
    assert.deepEqual(tabsOf({ status: "revision", admin_status: "rejected" }), ["rejected", "all"]);
    const legacy = { status: "submitted", admin_status: "rejected" };
    assert.deepEqual(tabsOf(legacy), ["rejected", "all"]);
    assert.equal(reportBadgeKey(legacy), "revision");
});

test("a permanently rejected report lands in Revision / rejected, not in Needs review", () => {
    assert.deepEqual(tabsOf({ status: "rejected" }), ["rejected", "all"]);
    assert.deepEqual(tabsOf({ status: "submitted", faculty_status: "rejected" }), ["rejected", "all"]);
});

test("NGO-verified and fee-held reports still need the admin", () => {
    assert.deepEqual(tabsOf({ status: "partner_verified", admin_status: "pending" }), ["pending", "all"]);
    assert.deepEqual(tabsOf({ status: "payment_pending", admin_status: "pending" }), ["pending", "all"]);
});

test("drafts are in no queue", () => {
    for (const status of ["draft", "continue", ""]) assert.deepEqual(tabsOf({ status }), ["all"]);
});

test("badge key never falls back to a raw status that has no badge", () => {
    assert.equal(reportBadgeKey({ status: "revision", admin_status: "rejected" }), "revision");
    assert.equal(reportBadgeKey({ status: "payment_pending" }), "payment_pending");
    assert.equal(reportBadgeKey({ status: "Verified" }), "verified");
});

test("counts add up: closed rows only count in All", () => {
    const rows = [
        { status: "submitted", admin_status: "pending" },
        { status: "partner_verified", admin_status: "pending" },
        { status: "verified", admin_status: "approved" },
        { status: "closed", admin_status: "approved" },
        { status: "revision", admin_status: "rejected" },
        { status: "submitted", admin_status: "rejected" },
        { status: "payment_pending", admin_status: "pending" },
        { status: "draft" },
    ];
    assert.deepEqual(countReportQueues(rows), { needsReview: 3, verified: 1, revision: 2, all: 8 });
});
