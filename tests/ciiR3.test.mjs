// CII analyser R3 (CIEL_PK_Community_Impact_Analyzer_R3): scoring is unchanged from R2; R3 adds the curated
// answerable-question reference, the student report analysis export and student-facing headings.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { groupByDimension, parseAnswerableRegistry, registrySummary } from "../src/utils/ciiAnswerableRegistry.ts";
import { STUDENT_ANALYSIS_VERSION, buildStudentAnalysisRecord, studentAnalysisFileName } from "../src/utils/ciiStudentAnalysis.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(path.join(root, p), "utf8");
const json = (p) => JSON.parse(read(p));

test("the curated registry is 34 questions that all exist in the 440 bank, project and portfolio scoped", () => {
    const file = json("public/ciel-cii-answerable-registry.json");
    const registry = parseAnswerableRegistry(file);
    assert.ok(registry, "the shipped file passes validation");
    assert.equal(registry.version, "CIEL-ANSWERABLE-2026.11-R3");
    assert.deepEqual(registrySummary(registry.items), { candidates: 34, project: 30, portfolio: 4 });
    const bank = new Map(json("public/ciel-440-question-crosswalk.json").map((q) => [q.id, q]));
    for (const q of registry.items) {
        assert.ok(bank.has(q.id), `${q.id} is in the 440 bank`);
        assert.equal(q.question, bank.get(q.id).question, `${q.id} keeps the bank wording`);
    }
    assert.equal(new Set(registry.items.map((q) => q.id)).size, 34, "no duplicates");
    assert.ok(!JSON.stringify(file).includes("answer\":"), "no AI-proposed answers are shipped");
});

test("grouping follows rubric order and malformed files are rejected", () => {
    const groups = groupByDimension(parseAnswerableRegistry(json("public/ciel-cii-answerable-registry.json")).items);
    const order = groups.map((g) => g.dimension);
    assert.deepEqual(order, [...order].sort((a, b) => ["1", "2", "3", "4A", "4B", "5", "6", "7", "8", "9"].indexOf(a) - ["1", "2", "3", "4A", "4B", "5", "6", "7", "8", "9"].indexOf(b)));
    assert.equal(parseAnswerableRegistry(null), null);
    assert.equal(parseAnswerableRegistry({ version: "x" }), null);
    assert.equal(parseAnswerableRegistry({ version: "x", items: [{ id: "a", scope: "institution", dimension: "1", question: "q" }] }), null);
    assert.equal(parseAnswerableRegistry({ version: "x", items: [{ id: "a", scope: "project", dimension: "10", question: "q" }] }), null);
});

const base = {
    locked: true,
    reportId: "REP-2026-001",
    projectTitle: "Clean water drive",
    studentName: "Ayesha",
    university: "BNU",
    finalCII: 84.46,
    badgeName: "Distinguished Impact Contributor",
    badgeLevel: 5,
    approvalHash: "abc123",
    approvedAt: "2026-11-10T10:00:00Z",
    sections: [{ dimension: "1", name: "Participation", score: 8.44, maximumPoints: 10 }, { name: "" }],
    overallAnalysis: "  A clear, evidence-led project.  ",
    strengths: ["Strong baseline", "  ", "Community voice"],
    areasToGrow: ["Add a follow-up check"],
    adminComment: "Well done.",
};

test("the student analysis record exists only for a locked approval and keeps the approved figures", () => {
    assert.equal(buildStudentAnalysisRecord({ ...base, locked: false }), null);
    assert.equal(buildStudentAnalysisRecord({ ...base, finalCII: null }), null);
    const r = buildStudentAnalysisRecord(base);
    assert.equal(r.version, STUDENT_ANALYSIS_VERSION);
    assert.equal(r.version, "CIEL-STUDENT-REPORT-ANALYSIS-R3");
    assert.equal(r.officialApproval, true);
    assert.equal(r.finalCII, 84.5);
    assert.deepEqual(r.badge, { name: "Distinguished Impact Contributor", level: 5 });
    assert.deepEqual(r.sectionScores, [{ dimension: "1", title: "Participation", score: 8.4, maximum: 10 }]);
    assert.equal(r.overallAnalysis, "A clear, evidence-led project.");
    assert.deepEqual(r.strengths, ["Strong baseline", "Community voice"]);
    assert.deepEqual(r.areasToGrow, ["Add a follow-up check"]);
    assert.equal(r.approvalHash, "abc123");
    assert.equal(buildStudentAnalysisRecord({ ...base, badgeName: null }).badge, null);
    assert.equal(studentAnalysisFileName("REP/2026 001"), "CIEL_PK_Student_Report_Analysis_REP_2026_001.json");
});

test("the analyser wires the reference panel and export without touching scoring or approval", () => {
    const analyser = read("src/components/ciel/community-service/CommunityCiiAnalyser.tsx");
    assert.match(analyser, /<CiiAnswerableRegistryPanel dimensionNames=\{dimensionNames\} \/>/);
    assert.match(analyser, /\{locked \? \(\s*<button type="button" className="secondary" onClick=\{exportStudentAnalysis\}>/);
    // the existing steps keep their order: AI analysis, then the manual evidence layer, then final feedback and approval
    assert.ok(analyser.indexOf("AI ANALYSIS · ADMIN ONLY") < analyser.indexOf("<CiiAnswerableRegistryPanel"));
    assert.ok(analyser.indexOf("<CiiAnswerableRegistryPanel") < analyser.indexOf("ADMIN MANUAL LAYER"));
    assert.ok(analyser.indexOf("ADMIN MANUAL LAYER") < analyser.indexOf("FINAL FEEDBACK"));
    assert.ok(analyser.indexOf("FINAL FEEDBACK") < analyser.indexOf("CIEL PK FINAL AUTHORITY"));
    const panel = read("src/components/ciel/community-service/CiiAnswerableRegistryPanel.tsx");
    assert.doesNotMatch(panel, /authenticatedFetch|\/api\/v1\//, "the panel is a static reference and never calls the API");
    const sheet = read("src/components/ciel/community-service/CiiFinalOnePageSheet.tsx");
    assert.match(sheet, /<h3>Strengths<\/h3>/);
    assert.match(sheet, /<h3>Areas to Grow &amp; Next Steps<\/h3>/);
});
