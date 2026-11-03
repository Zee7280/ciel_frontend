// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

// `ciiAnalyserView.ts` imports its sibling without an extension (as the Next bundle expects);
// Node's type stripping needs one, so resolve "./x" → "./x.ts" for this test only.
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
    anchorOptionLabel,
    anchorPoints,
    badgeCapNote,
    buildFeedbackSections,
    feedbackPlainText,
    finalChecklist,
    formatPts,
    gatePills,
} = await import("../src/utils/ciiAnalyserView.ts");

test("anchor points follow the locked factor table and round to 2dp", () => {
    assert.equal(anchorPoints(3, 0), 0);
    assert.equal(anchorPoints(3, 1), 1.5);
    assert.equal(anchorPoints(3, 2), 2.1);
    assert.equal(anchorPoints(3, 3), 2.55);
    assert.equal(anchorPoints(3, 4), 3);
    assert.equal(anchorPoints(2.5, "3"), 2.13); // 2.125 rounded
    assert.equal(anchorPoints(3, "P"), null);
    assert.equal(anchorPoints(3, ""), null);
    assert.equal(anchorPoints(3, 5), null);
});

test("formatting and option labels", () => {
    assert.equal(formatPts(2.55), "2.55");
    assert.equal(formatPts(3), "3");
    assert.equal(formatPts(null), "—");
    assert.equal(anchorOptionLabel(3, 3), "3 · Strong (2.55 / 3)");
    assert.equal(anchorOptionLabel(2, 0), "0 · Missing (0 / 2)");
});

test("gate pills and cap note read the server result only", () => {
    const pills = gatePills({ qualityGates: { L4: true, L5: false, L6: false } });
    assert.deepEqual(
        pills.map((p) => [p.code, p.passed]),
        [
            ["L4", true],
            ["L5", false],
            ["L6", false],
        ],
    );
    assert.equal(gatePills(null).every((p) => !p.passed), true);
    assert.equal(badgeCapNote({ code: "L4", numericLevel: 5, gateCapped: true }), "Score band L5 · capped to L4 by quality gate");
    assert.equal(badgeCapNote({ code: "L4", numericLevel: 4, gateCapped: false }), null);
    assert.equal(badgeCapNote(null), null);
});

const criterion = (criterion, anchor, reasoningSummary = "ok") => ({ criterion, anchor, reasoningSummary });

const result = {
    scoreStatus: "ADMIN_EVIDENCE_REQUIRED",
    adminReviewReasons: [],
    qualityGates: { L4: true, L5: true, L6: false },
    inputCompleteness: {
        gaps: [],
        individualHours: [{ studentId: "s1", hours: 16, requiredHours: 16, verified: true, recordComplete: true }],
        mandatoryFieldsComplete: true,
    },
    sectionScores: [
        { dimension: "9", name: "Sustainability & Handover", maximumPoints: 5, score: 4, criterionScores: [criterion("continuation", 3)] },
        { dimension: "1", name: "Participation & Individual Effort", maximumPoints: 10, score: 8.5, criterionScores: [criterion("role", 3), criterion("quality", 4, "")] },
        { dimension: "7", name: "Evidence, Ethics & Verification", maximumPoints: 15, score: null, criterionScores: [] },
    ],
    sectionAnalyses: [{ dimension: "1", summary: "Clear personal role.", strengths: ["Led sessions"], limitations: ["Hours log thin"], adminFlags: [] }],
};

test("checklist is display-only and reports each readiness item", () => {
    const list = finalChecklist({ result, dim7Complete: false, packetOk: true, locked: false });
    const byLabel = Object.fromEntries(list.map((i) => [i.label, i]));
    assert.equal(byLabel["Student packet complete"].ok, true);
    assert.equal(byLabel["AI scored every criterion"].ok, true);
    assert.equal(byLabel["AI reasoning supplied for every criterion"].ok, false);
    assert.equal(byLabel["AI reasoning supplied for every criterion"].detail, "2 of 3 with reasoning");
    assert.equal(byLabel["All seven evidence marks entered"].ok, false);
    assert.equal(byLabel["Hours and mandatory fields complete"].ok, true);
    assert.equal(byLabel["No open analysis flags"].ok, true);

    const short = finalChecklist({
        result: { ...result, scoreStatus: "RESUBMISSION_REQUIRED", inputCompleteness: { ...result.inputCompleteness, individualHours: [{ studentId: "s1", hours: 10, requiredHours: 16, recordComplete: true }] } },
        dim7Complete: true,
        packetOk: true,
        locked: false,
    });
    assert.equal(short.find((i) => i.label === "Hours and mandatory fields complete").detail, "A student is below the required hours");
    assert.equal(short.find((i) => i.label === "No open analysis flags").ok, false);
    assert.equal(finalChecklist({ result: null, dim7Complete: false, packetOk: false, locked: false }).every((i) => !i.ok), true);
});

test("feedback sections come in rubric order and D7 uses the Admin's draft ratings", () => {
    const sections = buildFeedbackSections(result, {
        anchors: { participation: "3", activities: "4", reach: "2", outcomes: "3", resourcesPartners: "1", ethics: "4", coverage: "3" },
        comments: { reach: "Headcount photo only" },
        confirmed: false,
    });
    assert.deepEqual(
        sections.map((s) => s.dimension),
        ["1", "7", "9"],
    );
    const d1 = sections[0];
    assert.equal(d1.summary, "Clear personal role.");
    assert.deepEqual(d1.strengths, ["Led sessions"]);
    assert.equal(d1.recommendation, "Address the limitations noted above in the next submission.");
    const d7 = sections[1];
    // 2×.85 + 3×1 + 2×.7 + 3×.85 + 2×.5 + 2×1 + 1×.85 = 1.7+3+1.4+2.55+1+2+.85 = 12.5
    assert.equal(d7.score, 12.5);
    assert.match(d7.limitations[0], /Beneficiary count proof, Resources & partner proof/);
    assert.match(d7.evidenceNotes.find((n) => n.startsWith("Beneficiary count proof")), /Sound — Headcount photo only/);
    assert.equal(d7.summary, "Draft Admin evidence ratings — confirmed at Approve Score.");

    const pending = buildFeedbackSections(result, { anchors: {}, comments: {}, confirmed: false })[1];
    assert.equal(pending.score, null);
    assert.match(pending.summary, /pending/);
    assert.equal(buildFeedbackSections(null, { anchors: {}, comments: {}, confirmed: false }).length, 0);
});

test("plain-text feedback carries scores, every section and the Admin comment", () => {
    const sections = buildFeedbackSections(result, { anchors: {}, comments: {}, confirmed: false });
    const text = feedbackPlainText(
        {
            projectTitle: "Clean Water Drive",
            studentName: "A. Student",
            university: "BNU",
            reportId: "r-1",
            aiScore: 72.5,
            evidenceScore: null,
            compositeScore: null,
            badgeLabel: "Pending",
            locked: false,
            overallStrengths: ["Strong delivery"],
            adminComment: "Well done.",
        },
        sections,
    );
    assert.match(text, /^CIEL PK — Community Impact Assessment/);
    assert.match(text, /AI report quality: 72\.5 \/ 85/);
    assert.match(text, /Admin evidence: — \/ 15/);
    assert.match(text, /SECTION 1 — D1 Participation & Individual Effort \(8\.5 \/ 10\)/);
    assert.match(text, /SECTION 2 — D7 Evidence/);
    assert.match(text, /SECTION 3 — D9 /);
    assert.match(text, /Overall strengths: Strong delivery/);
    assert.match(text, /Admin comment: Well done\.\n$/);
});
