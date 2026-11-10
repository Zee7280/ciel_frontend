// CII analyser R3 Admin review UI: criterion mark review, L6 qualification form, supplemental evidence
// form and the review record. Pure helpers plus wiring assertions (the score is always the server's).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
    EMPTY_L6_FORM,
    MIN_MODERATION_REASON,
    approveToast,
    buildModeratePayload,
    buildReviewRecord,
    describeLogEntry,
    diffCriterionEdits,
    l6ApprovePayload,
    l6FormEntered,
    markInputText,
    markRowsFor,
    moderationRevision,
    parseMarkInput,
    pendingCriteria,
    reviewRecordFileName,
    sectionOptionLabel,
    sectionTotalFromInputs,
    showL6Panel,
    validateSupplementalForm,
} from "../src/utils/ciiModerationView.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(path.join(root, p), "utf8");

// Dimension 1 of an R3 analysis where every criterion is Sound (anchor 2): 0.7 x weight.
const section = {
    dimension: "1",
    criterionScores: [
        { criterion: "hoursRequirement", maximumPoints: 4, score: 2.8, aiScore: 2.8, adminEdited: false },
        { criterion: "attendanceValidity", maximumPoints: 2, score: 1.4, aiScore: 1.4, adminEdited: false },
        { criterion: "contributionAgency", maximumPoints: 2, score: 1.4, aiScore: 1.4, adminEdited: false },
        { criterion: "participationAccount", maximumPoints: 2, score: 1.4, aiScore: 1.4, adminEdited: false },
    ],
};
const rows = markRowsFor(section);

test("a typed mark is blank, or a number within 0..max with at most two decimals", () => {
    assert.deepEqual(parseMarkInput("", 4), { ok: true, value: null });
    assert.deepEqual(parseMarkInput(" 3.25 ", 4), { ok: true, value: 3.25 });
    assert.equal(parseMarkInput("4", 4).value, 4);
    assert.equal(parseMarkInput("4.01", 4).ok, false);
    assert.equal(parseMarkInput("-1", 4).ok, false);
    assert.equal(parseMarkInput("2.555", 4).ok, false);
    assert.equal(parseMarkInput("abc", 4).ok, false);
    assert.equal(parseMarkInput("1e1", 20).ok, false);
    assert.equal(markInputText(2.8), "2.8");
    assert.equal(markInputText(null), "");
});

test("only touched criteria are sent; a mark equal to the one in force is not a change", () => {
    assert.deepEqual(diffCriterionEdits(rows, {}), { edits: {}, errors: {}, changed: [] });
    const diff = diffCriterionEdits(rows, { hoursRequirement: "4", attendanceValidity: "1.4", contributionAgency: "1.9" });
    assert.deepEqual(diff.edits, { hoursRequirement: 4, contributionAgency: 1.9 });
    assert.deepEqual(diff.changed, ["hoursRequirement", "contributionAgency"]);
    assert.deepEqual(diff.errors, {});
});

test("restoring: the AI mark on an edited criterion, or a blank over a pending AI mark, sends null", () => {
    const edited = markRowsFor({
        criterionScores: [
            { criterion: "a", maximumPoints: 4, score: 4, aiScore: 2.8, adminEdited: true },
            { criterion: "b", maximumPoints: 3, score: 2, aiScore: null, adminEdited: true },
            { criterion: "c", maximumPoints: 3, score: null, aiScore: null, adminEdited: false },
        ],
    });
    assert.deepEqual(diffCriterionEdits(edited, { a: "2.8", b: "" }).edits, { a: null, b: null });
    // a blank on an untouched pending criterion is no change; typing a mark resolves it
    assert.deepEqual(diffCriterionEdits(edited, { c: "" }).edits, {});
    assert.deepEqual(diffCriterionEdits(edited, { c: "1.5" }).edits, { c: 1.5 });
});

test("errors: out of range, too many decimals, or a blank over a real AI mark", () => {
    const diff = diffCriterionEdits(rows, { hoursRequirement: "4.5", attendanceValidity: "1.255", contributionAgency: "" });
    assert.equal(diff.errors.hoursRequirement, "Must be between 0 and 4.");
    assert.equal(diff.errors.attendanceValidity, "At most two decimals.");
    assert.match(diff.errors.contributionAgency, /restore the AI mark/);
    assert.deepEqual(diff.changed, []);
});

test("the live section total uses typed marks, flags unsaved edits and is null while a criterion has no mark", () => {
    assert.deepEqual(sectionTotalFromInputs(rows, {}), { total: 7, unsaved: false });
    assert.deepEqual(sectionTotalFromInputs(rows, { hoursRequirement: "4" }), { total: 8.2, unsaved: true });
    // an invalid input keeps the mark in force but is flagged unsaved
    assert.deepEqual(sectionTotalFromInputs(rows, { hoursRequirement: "9" }), { total: 7, unsaved: true });
    const pending = markRowsFor({ criterionScores: [{ criterion: "x", maximumPoints: 3, score: null, aiScore: null }] });
    assert.deepEqual(sectionTotalFromInputs(pending, {}), { total: null, unsaved: false });
    assert.deepEqual(sectionTotalFromInputs(pending, { x: "2" }), { total: 2, unsaved: true });
});

test("the /moderate body needs a changed mark and a reason of 8+ characters, and carries the revision read", () => {
    const diff = diffCriterionEdits(rows, { hoursRequirement: "4" });
    assert.equal(buildModeratePayload({ dimension: "1", diff, reason: "short", revision: 0 }).ok, false);
    assert.match(buildModeratePayload({ dimension: "1", diff: diffCriterionEdits(rows, {}), reason: "A long enough reason.", revision: 0 }).error, /No mark was changed/);
    assert.match(buildModeratePayload({ dimension: "1", diff: diffCriterionEdits(rows, { hoursRequirement: "9" }), reason: "A long enough reason.", revision: 0 }).error, /Fix the marked criterion/);
    const ok = buildModeratePayload({ dimension: "1", diff, reason: "  Register page 2 confirms the hours.  ", sourceRef: " section1.attendance ", revision: 3 });
    assert.deepEqual(ok, {
        ok: true,
        payload: {
            dimension: "1",
            criterionEdits: { hoursRequirement: 4 },
            reason: "Register page 2 confirms the hours.",
            sourceRef: "section1.attendance",
            expectedRevision: 3,
        },
    });
    assert.equal("sourceRef" in buildModeratePayload({ dimension: "1", diff, reason: "A long enough reason.", revision: undefined }).payload, false);
    assert.equal(buildModeratePayload({ dimension: "1", diff, reason: "A long enough reason.", revision: undefined }).payload.expectedRevision, 0);
    assert.equal(MIN_MODERATION_REASON, 8);
    assert.equal(moderationRevision(null), 0);
    assert.equal(moderationRevision({ adminModeration: { revision: 4 } }), 4);
});

test("review log lines carry the before/after marks, the AI mark and the reason", () => {
    const label = (d, c) => `D${d} ${c}`;
    assert.equal(
        describeLogEntry({ dimension: "1", criterion: "hoursRequirement", from: 2.8, to: 4, aiScore: 2.8, reason: "Register confirms.", actorId: "a", at: "t" }, label),
        "D1 hoursRequirement: 2.8 → 4 (AI 2.8). Register confirms.",
    );
    assert.match(describeLogEntry({ dimension: "1", criterion: "x", from: 4, to: 2.8, aiScore: 2.8, reason: "Restoring.", actorId: "a", at: "t" }, label), /· restored/);
    assert.match(describeLogEntry({ dimension: "9", criterion: "y", from: null, to: 2, aiScore: null, reason: "Filled.", actorId: "a", at: "t" }, label), /pending → 2 \(AI pending\)/);
});

test("pending criteria are listed for the readiness check, never Dimension 7", () => {
    const list = pendingCriteria([
        { dimension: "9", criterionScores: [{ criterion: "followUpRetention", score: null }, { criterion: "retainedBenefits", score: 1 }] },
        { dimension: "7", criterionScores: [{ criterion: "ethics", score: null }] },
    ]);
    assert.deepEqual(list, [{ dimension: "9", criterion: "followUpRetention" }]);
});

test("L6 form: only an R3 approval with something entered sends l6Qualification; the panel follows the CII and the lock", () => {
    assert.equal(l6FormEntered(EMPTY_L6_FORM), false);
    assert.equal(l6ApprovePayload(true, EMPTY_L6_FORM), undefined);
    assert.equal(l6ApprovePayload(false, { ...EMPTY_L6_FORM, observedRetention: true }), undefined);
    assert.deepEqual(l6ApprovePayload(true, { ...EMPTY_L6_FORM, observedRetention: true, sourceRef: "  section10.follow_up " }), {
        observedRetention: true,
        communityOwnership: false,
        externalCorroboration: false,
        sourceRef: "section10.follow_up",
    });
    assert.equal(showL6Panel({ r3: true, locked: false, composite: 91.2, badgeStatus: null }), "approve");
    assert.equal(showL6Panel({ r3: true, locked: false, composite: 89.9, badgeStatus: null }), null);
    assert.equal(showL6Panel({ r3: true, locked: false, composite: null, badgeStatus: null }), null);
    assert.equal(showL6Panel({ r3: true, locked: true, composite: 95, badgeStatus: "L6_PENDING_QUALIFICATION" }), "confirm");
    assert.equal(showL6Panel({ r3: true, locked: true, composite: 95, badgeStatus: "AWARDED" }), null);
    assert.equal(showL6Panel({ r3: false, locked: false, composite: 95, badgeStatus: null }), null);
});

test("the approve toast never claims a badge for a pending L6", () => {
    assert.match(approveToast("L6_PENDING_QUALIFICATION", true), /L6 stays pending/);
    assert.doesNotMatch(approveToast("L6_PENDING_QUALIFICATION", true), /badge issued/);
    assert.equal(approveToast("AWARDED", true), "CII v5.0 approved and locked — badge issued");
    assert.equal(approveToast(undefined, false), "CII v5.0 approved and locked — badge issued");
    assert.equal(approveToast("L6_PENDING_QUALIFICATION", false), "CII v5.0 approved and locked — badge issued", "earlier rubrics keep their message");
});

test("the supplemental evidence form needs a file and a 3-120 character label", () => {
    assert.equal(validateSupplementalForm({ hasFile: false, label: "Partner letter" }), "Choose a file to attach.");
    assert.match(validateSupplementalForm({ hasFile: true, label: "ab" }), /Label the file/);
    assert.match(validateSupplementalForm({ hasFile: true, label: "x".repeat(121) }), /at most 120/);
    assert.equal(validateSupplementalForm({ hasFile: true, label: "Partner letter" }), null);
    assert.equal(sectionOptionLabel("general"), "General (whole report)");
    assert.equal(sectionOptionLabel("4B"), "Section 4B");
});

test("the review record keeps the AI baseline, the reviewed marks, the log, evidence marks and approval", () => {
    const result = {
        rubricVersion: "CIEL-CII-2026.11-R3",
        aiProposalScore: 59.5,
        aiReportScore: 60.7,
        adminEvidenceScore: 10.5,
        finalCII: null,
        diagnosticCII: 71.2,
        moderated: true,
        badgeStatus: null,
        adminModeration: { revision: 1, edits: {}, log: [{ reason: "r" }] },
        sectionScores: [
            {
                dimension: "1",
                name: "Participation",
                maximumPoints: 10,
                score: 8.2,
                criterionScores: [{ criterion: "hoursRequirement", anchor: 2, maximumPoints: 4, score: 4, aiScore: 2.8, adminEdited: true }],
            },
        ],
    };
    const unlocked = buildReviewRecord({
        reportId: "REP-1",
        projectTitle: "Clean water",
        result,
        lock: null,
        evidenceMarks: { ethics: "3" },
        evidenceComments: { ethics: "ok" },
        adminComment: "Good",
        supplemental: [{ id: "e1" }],
        exportedAt: "2026-11-10T00:00:00.000Z",
    });
    assert.equal(unlocked.kind, "ciel-admin-review-record");
    assert.equal(unlocked.rubricVersion, "CIEL-CII-2026.11-R3");
    assert.equal(unlocked.officialApproval, false);
    assert.deepEqual(unlocked.scores, { aiProposal: 59.5, aiReviewed: 60.7, adminEvidence: 10.5, cii: 71.2, moderated: true });
    assert.deepEqual(unlocked.sections[0].criteria[0], { criterion: "hoursRequirement", anchor: 2, maximum: 4, aiMark: 2.8, reviewedMark: 4, adminEdited: true });
    assert.equal(unlocked.adminModeration.revision, 1);
    assert.deepEqual(unlocked.evidenceMarks, { anchors: { ethics: "3" }, comments: { ethics: "ok" } });
    assert.equal(unlocked.approval, null);
    const locked = buildReviewRecord({
        reportId: "REP-1",
        projectTitle: "Clean water",
        result,
        lock: { locked: true, hash: "h", lockedAt: "t", lockedByAdminId: "a", adminApprovedScore: 71.2, badgeStatus: "AWARDED", finalBadge: { code: "L4" } },
        evidenceMarks: {},
        evidenceComments: {},
        adminComment: "",
        supplemental: [],
        exportedAt: "x",
    });
    assert.equal(locked.officialApproval, true);
    assert.equal(locked.scores.cii, 71.2);
    assert.deepEqual(locked.approval, { hash: "h", lockedAt: "t", lockedByAdminId: "a" });
    assert.equal(locked.badge.status, "AWARDED");
    // an analysis with no result still exports (nothing to lose, nothing invented)
    assert.equal(buildReviewRecord({ reportId: "R", projectTitle: "", result: null, lock: null, evidenceMarks: {}, evidenceComments: {}, adminComment: "", supplemental: [], exportedAt: "x" }).scores.aiProposal, null);
    assert.equal(reviewRecordFileName("REP/2026 001"), "CIEL_PK_Admin_Review_Record_REP_2026_001.json");
});

test("the analyser wires the R3 review UI behind R3, Admin and unlocked checks, and leaves the legacy table alone", () => {
    const analyser = read("src/components/ciel/community-service/CommunityCiiAnalyser.tsx");
    assert.match(analyser, /const r3 = isR3Analysis\(ciiV45\);/);
    assert.match(analyser, /const canReviewMarks = isCielPk && !readOnly && r3 && !locked;/);
    assert.match(analyser, /const marksMode = canReviewMarks \? "r3-edit" : r3 \? "r3-readonly" : "legacy";/);
    assert.match(analyser, /\/cii-v4-5\/moderate/);
    assert.match(analyser, /\/cii-v4-5\/l6-qualification/);
    assert.match(analyser, /\/supplemental-evidence/);
    assert.match(analyser, /expectedRevision|moderationRevision\(ciiV45\)/);
    // sections start collapsed for R3 only
    assert.match(analyser, /const effectiveOpenSection = openSection \?\? \(r3 \? "" : "1"\);/);
    // stale evidence blocks Approve, in the handler and on the button
    assert.match(analyser, /if \(analysisStale\) \{/);
    assert.match(analyser, /disabled=\{approving \|\| Boolean\(hardBlock\) \|\| analysisStale \|\|/);
    // the L6 body is only sent for R3 and when something was entered
    assert.match(analyser, /l6ApprovePayload\(r3, l6Form\)/);
    // the pending badge text replaces the ambiguous "Pending" for a locked pending L6
    assert.match(analyser, /L6 pending qualification/);
    // the existing steps keep their order
    assert.ok(analyser.indexOf("AI ANALYSIS · ADMIN ONLY") < analyser.indexOf("ADMIN MANUAL LAYER"));
    assert.ok(analyser.indexOf("ADMIN MANUAL LAYER") < analyser.indexOf("FINAL FEEDBACK"));
    assert.ok(analyser.indexOf("FINAL FEEDBACK") < analyser.indexOf("CIEL PK FINAL AUTHORITY"));

    const marks = read("src/components/ciel/community-service/CiiCriterionMarks.tsx");
    // legacy mode is the original read-only table (same headings), R3 edit mode never edits Dimension 7 here
    assert.match(marks, /<th>Locked criterion<\/th>\s*<th>Anchor<\/th>\s*<th>Marks<\/th>\s*<th>AI reasoning<\/th>/);
    assert.match(marks, /Restore AI mark/);
    const supp = read("src/components/ciel/community-service/CiiSupplementalEvidencePanel.tsx");
    assert.match(supp, /uploadFileViaPresign\(`\$\{basePath\}\/presign`/);
    assert.match(supp, /Supplemental · \{item\.label\}/);
    assert.match(analyser, /isCielPk && !readOnly && !locked && r3 \? \(\s*<CiiSupplementalEvidencePanel/);
});
