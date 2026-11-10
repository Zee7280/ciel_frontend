// CII rubric R3 (CIEL-CII-2026.11-R3) on the frontend: the 45-criterion table and labels, the L6
// qualification policy mirror, and a pending L6 never being shown as an awarded badge anywhere.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { registerHooks } from "node:module";

// `ciiAnalyserView.ts` imports its sibling without an extension (as the Next bundle expects);
// Node's type stripping needs one, so resolve "./x" -> "./x.ts" for this test only.
registerHooks({
    resolve(specifier, context, nextResolve) {
        try {
            return nextResolve(specifier, context);
        } catch (error) {
            if (specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) return nextResolve(`${specifier}.ts`, context);
            throw error;
        }
    },
});

const {
    CII_V45_DIMENSIONS,
    CII_V45_L6_POLICY,
    CII_V45_R2_RUBRIC_VERSION,
    CII_V45_RUBRIC_VERSION,
    assessL6,
    badgeStatusLabel,
    criterionLabel,
    isR3Analysis,
    resolveBadgeForScore,
    resolveBadgeForScoreR3,
} = await import("../src/utils/communityCiiAnalyser.ts");
const { CII_L6_PENDING_LABEL, isCiiL6Pending, pickCiiV45DisplayBadgeName, readCiiV45DisplayFromReport } = await import("../src/utils/reportCiiSnapshot.ts");
const { resolveCiiLevelRecognition, resolveCiiLevelTitle } = await import("../src/utils/ciiLevelBadge.ts");
const { buildFeedbackSections, feedbackPlainText, finalChecklist, gatePills } = await import("../src/utils/ciiAnalyserView.ts");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(path.join(root, p), "utf8");

test("the frontend table is the R3 table: 38 AI criteria worth 85 plus 7 Admin criteria worth 15", () => {
    assert.equal(CII_V45_RUBRIC_VERSION, "CIEL-CII-2026.11-R3");
    assert.equal(CII_V45_R2_RUBRIC_VERSION, "CIEL-CII-2026.11-R2");
    const max = Object.fromEntries(CII_V45_DIMENSIONS.map((d) => [d.id, d.maxPoints]));
    assert.deepEqual(max, { 1: 10, 2: 10, 3: 5, "4A": 15, "4B": 15, 5: 10, 6: 5, 7: 15, 8: 5, 9: 10 });
    const count = (ids) => CII_V45_DIMENSIONS.filter((d) => ids.includes(d.id)).reduce((t, d) => t + d.criteria.length, 0);
    assert.equal(count(["1", "2", "3", "4A", "4B", "5", "6", "8", "9"]), 38);
    assert.equal(count(["7"]), 7);
    for (const d of CII_V45_DIMENSIONS) {
        assert.ok(Math.abs(d.criteria.reduce((t, c) => t + c.weight, 0) - d.maxPoints) < 1e-9, `dimension ${d.id} weights add up`);
        for (const c of d.criteria) assert.ok(c.label.length > 3, `${d.id}.${c.key} has a label`);
    }
    assert.deepEqual(CII_V45_DIMENSIONS.find((d) => d.id === "4B").criteria.map((c) => c.weight), [4, 2, 3, 2, 2, 2]);
});

test("labels resolve for R3 keys and still for the R2 and R1 keys stored on older analyses", () => {
    assert.equal(criterionLabel("1", "hoursRequirement"), "Individual hours requirement");
    assert.equal(criterionLabel("4B", "observedChange"), "Observed change from a comparable start");
    // R2 keys (the table before R3), R1 keys and the older AI alias keep readable labels
    assert.equal(criterionLabel("1", "continuity"), "Regularity & follow-through");
    assert.equal(criterionLabel("4B", "attribution"), "Attribution honesty");
    assert.equal(criterionLabel("6", "relevance"), "Right stakeholders");
    assert.equal(criterionLabel("9", "continuation"), "Continuation plan");
    assert.equal(criterionLabel("1", "hoursConsistency"), "Individual hours requirement");
    assert.equal(criterionLabel("1", "hoursCompletion"), "Hours requirement met");
    assert.equal(criterionLabel("2", "unheardOfKey"), "unheardOfKey");
});

test("only an analysis stamped R3 is an R3 analysis", () => {
    assert.equal(isR3Analysis({ rubricVersion: CII_V45_RUBRIC_VERSION }), true);
    assert.equal(isR3Analysis({ rubricVersion: CII_V45_R2_RUBRIC_VERSION }), false);
    assert.equal(isR3Analysis({}), false);
    assert.equal(isR3Analysis(null), false);
});

test("R3 badge: no L4/L5 gate; a 90+ CII keeps its CII and leaves L6 pending, never L5", () => {
    assert.equal(resolveBadgeForScoreR3(82, false).badge.code, "L5");
    assert.equal(resolveBadgeForScoreR3(79.9, false).badge.code, "L4");
    const pending = resolveBadgeForScoreR3(95, false);
    assert.equal(pending.badge, null);
    assert.equal(pending.candidate.code, "L6");
    assert.equal(pending.status, "L6_PENDING_QUALIFICATION");
    assert.equal(resolveBadgeForScoreR3(95, true).badge.code, "L6");
    assert.deepEqual(resolveBadgeForScoreR3(null, false), { badge: null, candidate: null, status: null });
    // the older gate walk is untouched
    assert.equal(resolveBadgeForScore(95, { L4: true, L5: true, L6: false }).code, "L5");
});

test("the L6 qualification check mirrors the backend minima and confirmations", () => {
    assert.equal(CII_V45_L6_POLICY.minimumMeasuredChange, 12);
    const sections = [
        { dimension: "4B", score: 14 },
        { dimension: "9", score: 9 },
        { dimension: "7", score: 13 },
    ];
    const ok = { observedRetention: true, communityOwnership: true, externalCorroboration: true, sourceRef: "section10.follow_up" };
    assert.equal(assessL6(89.9, sections, ok).status, "NOT_REQUIRED");
    assert.equal(assessL6(95, sections, ok).status, "QUALIFIED");
    assert.deepEqual(assessL6(95, sections, null).reasons, [
        "Observed retained benefits not confirmed",
        "Community ownership or adoption not confirmed",
        "Corroboration outside the student team not confirmed",
        "Qualification source reference missing",
    ]);
    assert.deepEqual(assessL6(95, [{ dimension: "4B", score: 10 }, { dimension: "9", score: 9 }, { dimension: "7", score: 13 }], ok).reasons, ["Measured Change below 12/15"]);
    assert.equal(badgeStatusLabel("L6_PENDING_QUALIFICATION", null, "Transformative Impact Contributor"), "Transformative Impact Contributor · L6 pending qualification");
    assert.equal(badgeStatusLabel("AWARDED", "Distinguished Impact Contributor"), "Distinguished Impact Contributor");
    assert.equal(badgeStatusLabel(null, null), "Pending");
});

const pendingCii = {
    finalBadge: null,
    recommendedBadge: { name: "Transformative Impact Contributor", level: 6 },
    diagnosticBadge: { name: "Transformative Impact Contributor", level: 6 },
    badgeStatus: "L6_PENDING_QUALIFICATION",
    diagnosticCII: 95,
    finalCII: 95,
};
const pendingLock = { locked: true, adminApprovedScore: 95, badgeStatus: "L6_PENDING_QUALIFICATION", finalBadge: null };

test("a locked pending L6 is never read as an awarded badge name or a legacy score level", () => {
    assert.equal(isCiiL6Pending(pendingCii, pendingLock), true);
    assert.equal(isCiiL6Pending(pendingCii, { ...pendingLock, locked: false }), false, "an unlocked preview is not a pending award");
    assert.equal(isCiiL6Pending(pendingCii, { locked: true }), true, "the result status is enough when the lock lacks it");
    assert.equal(isCiiL6Pending({ finalBadge: null }, { locked: true }), false);
    assert.equal(pickCiiV45DisplayBadgeName(pendingCii, pendingLock), null);
    // unlocked and pre-R3 locks keep their existing fallbacks
    assert.equal(pickCiiV45DisplayBadgeName(pendingCii, { locked: false }), "Transformative Impact Contributor");
    assert.equal(pickCiiV45DisplayBadgeName({ ...pendingCii, badgeStatus: undefined }, { locked: true, adminApprovedScore: 95 }), "Transformative Impact Contributor");
    const display = readCiiV45DisplayFromReport({ ciiV45: pendingCii, ciiV45Lock: pendingLock });
    assert.equal(display.level, CII_L6_PENDING_LABEL);
    assert.equal(display.badgePending, true);
    assert.equal(display.score, 95);
    const normal = readCiiV45DisplayFromReport({ ciiV45: { finalBadge: { name: "Distinguished Impact Contributor" }, finalCII: 84 }, ciiV45Lock: { locked: true, adminApprovedScore: 84 } });
    assert.equal(normal.level, "Distinguished Impact Contributor");
    assert.equal(normal.badgePending, undefined);
});

test("the certificate recognition for a pending L6 has no badge image and says so", () => {
    const pending = resolveCiiLevelRecognition(95, { l6Pending: true });
    assert.equal(pending.pending, true);
    assert.equal(pending.badge.src, "");
    assert.equal(pending.level, 6);
    assert.match(pending.title, /pending qualification/);
    assert.match(pending.tagline, /approved and retained/);
    const awarded = resolveCiiLevelRecognition(95);
    assert.match(awarded.badge.src, /level-6-transformative/);
    assert.equal(awarded.pending, undefined);
    assert.equal(resolveCiiLevelTitle(95, { l6Pending: true }), pending.title);
    assert.equal(resolveCiiLevelTitle(82), "Distinguished Impact Contributor");
});

const r3Result = (extra = {}) => ({
    rubricVersion: CII_V45_RUBRIC_VERSION,
    qualityGates: { L4: true, L5: true, L6: false },
    scoreStatus: "FINAL",
    adminEvidenceAssessment: { status: "ASSESSED" },
    inputCompleteness: { gaps: [], individualHours: [{ studentId: "s", hours: 20, requiredHours: 16, recordComplete: true }], mandatoryFieldsComplete: true },
    adminReviewReasons: [],
    sectionScores: [
        {
            dimension: "1",
            name: "Participation & Individual Effort",
            maximumPoints: 10,
            score: 8.2,
            knownPoints: 8.2,
            criterionScores: [
                { criterion: "hoursRequirement", anchor: 2, maximumPoints: 4, score: 4, aiScore: 2.8, adminEdited: true, adminEdit: { reason: "Register page 2 confirms the hours." } },
                { criterion: "attendanceValidity", anchor: "P", maximumPoints: 2, score: 1.4, aiScore: null, adminEdited: true, adminEdit: { reason: "Filled from the register." } },
                { criterion: "contributionAgency", anchor: 2, maximumPoints: 2, score: 1.4, aiScore: 1.4, adminEdited: false },
                { criterion: "participationAccount", anchor: 2, maximumPoints: 2, score: 1.4, aiScore: 1.4, adminEdited: false },
            ],
        },
    ],
    ...extra,
});

test("gate pills describe the R3 rule (no L4/L5 gate, qualified L6) and keep the R2 gates for older analyses", () => {
    const pills = gatePills(r3Result({ l6Assessment: { status: "PENDING_QUALIFICATION", reasons: ["Measured Change below 12/15"], minimums: {} } }));
    assert.deepEqual(pills.map((p) => [p.code, p.passed]), [["L4", true], ["L5", true], ["L6", false]]);
    assert.match(pills[0].note, /No quality gate/);
    assert.match(pills[2].note, /Missing: Measured Change below 12\/15/);
    assert.equal(gatePills(r3Result({ l6Assessment: { status: "QUALIFIED", reasons: [], minimums: {} } }))[2].passed, true);
    const legacy = gatePills({ qualityGates: { L4: true, L5: false, L6: false } });
    assert.match(legacy[1].note, /4B ≥ 70%/);
});

test("the checklist counts an Admin-reviewed mark as scored and lists the L6 qualification", () => {
    const items = finalChecklist({
        result: r3Result({ l6Assessment: { status: "PENDING_QUALIFICATION", reasons: ["Qualification source reference missing"], minimums: {} } }),
        dim7Complete: true,
        packetOk: true,
        locked: false,
    });
    const scored = items.find((i) => i.label === "AI scored every criterion");
    assert.equal(scored.ok, true, "the pending criterion is resolved by an Admin mark");
    assert.equal(scored.detail, "4 of 4 criteria scored");
    const l6 = items.find((i) => i.label === "L6 sustained-impact qualification");
    assert.equal(l6.ok, false);
    assert.match(l6.detail, /Qualification source reference missing/);
    const none = finalChecklist({ result: r3Result({ l6Assessment: { status: "NOT_REQUIRED", reasons: [], minimums: {} } }), dim7Complete: true, packetOk: true, locked: false });
    assert.equal(none.some((i) => i.label.includes("L6")), false);
});

test("the feedback lists Admin-reviewed marks with the AI baseline and the reason", () => {
    const sections = buildFeedbackSections(r3Result(), { anchors: {}, comments: {}, confirmed: false });
    const d1 = sections.find((s) => s.dimension === "1");
    assert.equal(d1.reviewedMarks.length, 2);
    assert.match(d1.reviewedMarks[0], /AI 2\.8 → 4 \/ 4 — Register page 2 confirms the hours\./);
    assert.doesNotMatch(d1.summary, /pending/i, "a criterion the Admin resolved is not reported as pending");
    const text = feedbackPlainText(
        { projectTitle: "P", studentName: "S", reportId: "R", aiScore: 60.7, evidenceScore: 10.5, compositeScore: 71.2, badgeLabel: "Developing Impact Contributor", locked: false },
        sections,
    );
    assert.match(text, /Admin-reviewed marks: Individual hours requirement: AI 2\.8 → 4 \/ 4/);
});

test("every surface that showed a score-derived or fallback badge now respects a pending L6", () => {
    const certificate = read("src/app/dashboard/student/report/components/CertificateView.tsx");
    const packageCert = read("src/app/dashboard/student/report/impact-package/ImpactPackageCertificate.tsx");
    for (const src of [certificate, packageCert]) {
        assert.match(src, /isCiiL6Pending\(data\.ciiV45, data\.ciiV45Lock\)/);
        assert.match(src, /resolveCiiLevelRecognition\(ciiScore, \{ l6Pending: ciiL6Pending \}\)/);
        assert.match(src, /\{ciiBadge\.src \? \(/, "no empty badge image");
        assert.match(src, /PENDING QUALIFICATION/);
    }
    const print = read("src/app/dashboard/student/report/components/ReportPrintView.tsx");
    assert.match(print, /const ciiBadge = ciiL6Pending \? null : getCiiCertificateBadge/);
    assert.match(print, /resolveCiiLevelTitle\(totalScore, \{ l6Pending: ciiL6Pending \}\)/);
    const wall = read("src/app/dashboard/student/paths/community-service/CommunityImpactWall.tsx");
    assert.match(wall, /if \(isCiiL6Pending\(r\.ciiV45, r\.ciiV45Lock\)\) return CII_L6_PENDING_LABEL;/);
    assert.match(wall, /badgeSrc: l6Pending \? "" : badge\.src/);
    assert.match(wall, /\{fc\.badgeSrc \? \(/);
    const resolve = read("src/app/dashboard/student/report/utils/resolveReportCii.ts");
    assert.match(resolve, /isCiiL6Pending\(data\.ciiV45, data\.ciiV45Lock\)\s*\?\s*CII_L6_PENDING_LABEL/);
    const modal = read("src/components/ciel/community-service/CommunityCiiBreakdownModal.tsx");
    assert.match(modal, /const badge = l6Pending \? null :/);
    const pkg = read("src/app/dashboard/student/report/impact-package/ImpactPackage.tsx");
    assert.match(pkg, /badgeName=\{l6Pending \? CII_L6_PENDING_LABEL/);
    const verify = read("src/components/ImpactReportVerificationClient.tsx");
    assert.match(verify, /badge_status === "L6_PENDING_QUALIFICATION"/);
    const card = read("src/components/ciel/community-service/FacultyReportReviewCard.tsx");
    assert.match(card, /cii_badge_status === "L6_PENDING_QUALIFICATION"/);
    assert.match(read("src/app/dashboard/faculty/community-service/useFacultyCommunityServiceData.ts"), /cii_badge_status: pickStr\(item, "cii_badge_status"/);
    assert.match(read("src/app/dashboard/admin/community-service/page.tsx"), /cii_badge_status: pickReportStr\(item, "cii_badge_status"/);
});
