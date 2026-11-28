// Report wizard: each section's AI summary is checked against the answers it was written from.
// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
    combinedSummarySync,
    sectionSummarySource,
    sectionSummarySync,
} from "../src/app/dashboard/student/report/utils/sectionSummarySync.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(path.join(root, p), "utf8");

const section9 = () => ({
    skills_grown: ["Leadership", "Teamwork"],
    personal_learning: "I learned to plan with the host.",
    competency_scores: { cognitive_systemic: 4, practical_design: 3 },
    academic_integration: "applied",
});

const withSummary = (section) => ({ ...section, summary_text: "AI text.", summary_source: sectionSummarySource(section) });

test("a summary written from the current answers is fresh, even after a save round-trip", () => {
    const saved = withSummary(section9());
    assert.equal(sectionSummarySync(saved), "fresh");
    // Server / reload noise: key order, numbers as text, empty defaults, file objects.
    const reloaded = {
        summary_source: saved.summary_source,
        summary_text: "AI text.",
        academic_integration: "applied",
        competency_scores: { practical_design: "3", cognitive_systemic: "4", social_empathy: 0 === 1 ? 1 : undefined },
        personal_learning: "  I learned to plan with the host. ",
        skills_grown: ["Leadership", "Teamwork", ""],
        skills_grown_other: "",
        evidence_files: [{ name: "a.jpg", size: 10, type: "image/jpeg" }],
        updated_at: "2026-11-11",
    };
    assert.equal(sectionSummarySync(reloaded), "fresh");
});

test("editing an answer after the summary marks it stale", () => {
    const saved = withSummary(section9());
    assert.equal(sectionSummarySync({ ...saved, skills_grown: ["Leadership"] }), "stale");
    assert.equal(sectionSummarySync({ ...saved, competency_scores: { cognitive_systemic: 5, practical_design: 3 } }), "stale");
    assert.equal(sectionSummarySync({ ...saved, personal_learning: "Something else." }), "stale");
});

test("section 8 visibility the server rewrites does not count as an edit", () => {
    const answers = { evidence_types: ["Photos"], media_visible: "Institutional" };
    const saved = withSummary(answers);
    const fromServer = { ...saved, media_visible: "restricted", media_usage: "restricted", public_share_permission: false };
    assert.equal(sectionSummarySync(fromServer), "fresh");
    assert.equal(sectionSummarySync({ ...fromServer, media_visible: "public" }), "stale");
});

test("legacy and empty summaries; combined steps", () => {
    assert.equal(sectionSummarySync({ ...section9(), summary_text: "Old AI text." }), "unchecked");
    assert.equal(sectionSummarySync({ ...section9(), summary_text: "  " }), "none");
    assert.equal(sectionSummarySync(undefined), "none");
    assert.equal(combinedSummarySync(["fresh", "none"]), "fresh");
    assert.equal(combinedSummarySync(["fresh", "stale"]), "stale");
    assert.equal(combinedSummarySync(["unchecked", "fresh"]), "unchecked");
    assert.equal(combinedSummarySync(["none", "none"]), "none");
    assert.match(sectionSummarySource(section9()), /^v1:[0-9a-f]{8}:\d+$/);
});

test("Next no longer writes per-section AI summaries; only Step 1 keeps a summary card", () => {
    const page = read("src/app/dashboard/student/report/page.tsx");
    assert.doesNotMatch(page, /generateAISummary/);
    assert.doesNotMatch(page, /Analyzing Data & Writing Summary/);

    const chrome = read("src/app/dashboard/student/report/ReportFormChrome.tsx");
    // Steps 2–9 have no summary card any more; Step 1 keeps its own live participation summary.
    assert.doesNotMatch(chrome, /AI SUMMARY — WHAT THE RUBRIC WILL READ|Rewrite with AI/);
    assert.match(chrome, /if \(canonicalReportStep\(step\) !== 1\) return null;/);
    assert.match(chrome, /return <Section1ExecutiveSummary data=\{data\} \/>;/);
});
