// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
    addMonthsIso,
    computeFollowupDueDate,
    followupBlockErrors,
    followupPlanOf,
    followupStatusLabel,
    followupSummaryRows,
    hasFollowupContent,
    normalizeIsoDate,
    projectEndDateOf,
} from "../src/app/dashboard/student/report/utils/sustainabilityFollowup.ts";

test("adds calendar months and clamps to the end of a shorter month", () => {
    assert.equal(addMonthsIso("2026-11-05", 3), "2027-02-05");
    assert.equal(addMonthsIso("2026-11-05", 12), "2027-11-05");
    assert.equal(addMonthsIso("2026-01-31", 1), "2026-02-28");
    assert.equal(addMonthsIso("2028-01-31", 1), "2028-02-29");
    assert.equal(addMonthsIso("2026-12-15", 1), "2027-01-15");
    assert.equal(addMonthsIso("garbage", 3), "");
    assert.equal(addMonthsIso("2026-02-30", 3), "");
});

test("normalises dates from the opportunity, whatever shape they arrive in", () => {
    assert.equal(normalizeIsoDate("2026-11-05"), "2026-11-05");
    assert.equal(normalizeIsoDate("2026-11-05T19:00:00.000Z"), "2026-11-05");
    assert.equal(normalizeIsoDate("2026-13-40"), "");
    assert.equal(normalizeIsoDate(""), "");
    assert.equal(normalizeIsoDate(undefined), "");
    assert.equal(projectEndDateOf({ end_date: "2026-11-05T00:00:00Z" }), "2026-11-05");
    assert.equal(projectEndDateOf({ timeline: { endDate: "2026-06-30" } }), "2026-06-30");
    assert.equal(projectEndDateOf(null), "");
    assert.equal(projectEndDateOf({ end_date: "nope" }), "");
});

test("due date = project end + interval (default 3 months), or the chosen custom date", () => {
    assert.equal(computeFollowupDueDate({}, "2026-11-05"), "2027-02-05");
    assert.equal(computeFollowupDueDate({ followup_interval: "6" }, "2026-11-05"), "2027-05-05");
    assert.equal(computeFollowupDueDate({ followup_interval: "3" }, ""), "");
    assert.equal(computeFollowupDueDate({ followup_interval: "custom", followup_custom_date: "2027-01-10" }, ""), "2027-01-10");
    assert.equal(computeFollowupDueDate({ followup_interval: "custom" }, "2026-11-05"), "");
    assert.equal(computeFollowupDueDate(null, "2026-11-05"), "");
});

test("older reports (no followup_* keys) are untouched and never blocked", () => {
    assert.equal(followupPlanOf(undefined), "");
    assert.equal(followupPlanOf({ followup_plan: "bogus" }), "");
    assert.equal(hasFollowupContent({}), false);
    assert.equal(followupStatusLabel({}), "");
    assert.deepEqual(followupBlockErrors(undefined), []);
    assert.deepEqual(followupBlockErrors({}), []);
    assert.deepEqual(followupSummaryRows({}), []);
    assert.deepEqual(followupBlockErrors({ followup_plan: "later" }), []);
});

test("No needs a reason (and text for Other); Yes needs contact, valid email and due date", () => {
    assert.deepEqual(followupBlockErrors({ followup_plan: "no" }).map((e) => e.field), ["followup_no_reason"]);
    assert.deepEqual(
        followupBlockErrors({ followup_plan: "no", followup_no_reason: "Other" }).map((e) => e.field),
        ["followup_no_reason_other"],
    );
    assert.deepEqual(followupBlockErrors({ followup_plan: "no", followup_no_reason: "Follow-up is not feasible" }), []);
    assert.deepEqual(
        followupBlockErrors({ followup_plan: "yes" }).map((e) => e.field),
        ["followup_owner_role", "followup_owner_name", "followup_owner_email", "followup_due_date"],
    );
    assert.deepEqual(
        followupBlockErrors({
            followup_plan: "yes",
            followup_owner_role: "Faculty supervisor",
            followup_owner_name: "Dr Khan",
            followup_owner_email: "khan@",
            followup_due_date: "2027-02-05",
        }).map((e) => e.field),
        ["followup_owner_email"],
    );
    assert.deepEqual(
        followupBlockErrors({
            followup_plan: "yes",
            followup_owner_role: "Faculty supervisor",
            followup_owner_name: "Dr Khan",
            followup_owner_email: "khan@example.org",
            followup_due_date: "2027-02-05",
        }),
        [],
    );
});

test("read-only rows follow the plan, hide stale contact data, and only show the email when asked", () => {
    const stale = {
        followup_plan: "no",
        followup_no_reason: "Other",
        followup_no_reason_other: "Closed school",
        followup_owner_name: "Stale Person",
        followup_owner_email: "stale@example.org",
    };
    const noRows = followupSummaryRows(stale, { includeEmail: true });
    assert.equal(noRows[0].value, "Not planned");
    assert.equal(noRows[1].value, "Other — Closed school");
    assert.ok(!JSON.stringify(noRows).includes("stale"));

    const yes = {
        followup_plan: "yes",
        followup_owner_role: "Faculty supervisor",
        followup_owner_name: "Dr Khan",
        followup_owner_email: "khan@example.org",
        followup_due_date: "2027-02-05",
        followup_check: "Continuation of skills learned",
    };
    assert.ok(!JSON.stringify(followupSummaryRows(yes)).includes("khan@example.org"));
    assert.ok(JSON.stringify(followupSummaryRows(yes, { includeEmail: true })).includes("khan@example.org"));
    assert.equal(followupSummaryRows(yes)[0].value, "Planned — awaiting report approval");
    assert.equal(followupSummaryRows({ followup_plan: "later" })[1].value, "Assigned faculty supervisor (from opportunity)");
});

test("the student's reviewed partner questions appear as one read-only row (included, non-blank only; never for No/later)", () => {
    const questions = [
        { id: "a", activityTitle: "Tree plantation", questionText: "Are the trees still alive?", countLabel: "Trees surviving", include: true },
        { id: "b", activityTitle: "Workshop", questionText: "Skipped one", include: false },
        { id: "c", activityTitle: "", questionText: "   ", include: true },
        { id: "d", activityTitle: "", questionText: "Is the water filter still in use?", countLabel: null, include: true },
    ];
    const yes = { followup_plan: "yes", followup_owner_role: "Faculty supervisor", followup_owner_name: "Dr Khan", followup_due_date: "2027-02-05", followup_check: "x", followup_questions: questions };
    const row = followupSummaryRows(yes).find((r) => r.label.startsWith("Partner questions"));
    assert.ok(row && row.fullWidth);
    assert.equal(row.value, "1. Tree plantation — Are the trees still alive? (optional number: Trees surviving)\n2. Is the water filter still in use?");
    assert.ok(!row.value.includes("Skipped one"));
    // nothing when the set is absent / empty / malformed, or the plan is not Yes
    assert.ok(!followupSummaryRows({ ...yes, followup_questions: undefined }).some((r) => r.label.startsWith("Partner questions")));
    assert.ok(!followupSummaryRows({ ...yes, followup_questions: "garbage" }).some((r) => r.label.startsWith("Partner questions")));
    assert.ok(!followupSummaryRows({ followup_plan: "no", followup_no_reason: "Other", followup_no_reason_other: "x", followup_questions: questions }).some((r) => r.label.startsWith("Partner questions")));
    assert.ok(!followupSummaryRows({ followup_plan: "later", followup_questions: questions }).some((r) => r.label.startsWith("Partner questions")));
});
