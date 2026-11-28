// Section 2.2 "Rewrite with AI": one statement, refreshed on demand, clean fallback wording.
// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { composeSection2SmartDraft } from "../src/app/dashboard/student/report/utils/section2SmartDraft.ts";
import { sectionSummarySource, sectionSummarySync } from "../src/app/dashboard/student/report/utils/sectionSummarySync.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(path.join(root, p), "utf8");
const section2 = read("src/app/dashboard/student/report/components/Section2ProjectContext.tsx");
const chrome = read("src/app/dashboard/student/report/ReportFormChrome.tsx");

const answers = {
    problem: "The primary school had no working lights in three classrooms.",
    affectedGroup: "Students of the primary section",
    affectedCount: "26",
    gaps: ["Infrastructure", "Education Access"],
    sources: ["Site Visit", "Interviews with Teachers"],
    discipline: "Business & Management",
    contribution: "My background in operations helped us plan the procurement and installation schedule.",
};

test("fallback draft is factual, keeps the count as entered, and follows the section order: problem → group → gaps → how identified → academic contribution", () => {
    const text = composeSection2SmartDraft(answers);
    assert.equal(
        text,
        "Before the project began, the primary school had no working lights in three classrooms. " +
            "The group most affected was about 26 students of the primary section. " +
            "The main gaps were in infrastructure and education access. " +
            "This need was identified through site visit and interviews with teachers. " +
            "Drawing on Business & Management, my background in operations helped us plan the procurement and installation schedule.",
    );
});

test("no capital letter after a comma and no generic filler (the tester's examples)", () => {
    const text = composeSection2SmartDraft(answers);
    assert.doesNotMatch(text, /, [A-Z][a-z]/, "a clause after a comma must not start with a capital");
    for (const filler of [
        "daily reality rather than a statistic",
        "not guesswork",
        "goodwill alone",
        "visible but going unmet",
    ]) {
        assert.equal(text.includes(filler), false, `filler present: ${filler}`);
        assert.equal(section2.includes(filler), false, `filler still in the component: ${filler}`);
    }
});

test("only what was entered appears: no group → no group sentence; count alone still reads as a count; empty problem → empty", () => {
    assert.equal(composeSection2SmartDraft({ problem: "" }), "");
    assert.equal(
        composeSection2SmartDraft({ problem: "Water tanks were leaking." }),
        "Before the project began, water tanks were leaking.",
    );
    assert.equal(
        composeSection2SmartDraft({ problem: "Water tanks were leaking.", affectedCount: "40" }),
        "Before the project began, water tanks were leaking. About 40 people were affected.",
    );
    // Acronyms and proper nouns typed in caps are kept.
    assert.match(composeSection2SmartDraft({ problem: "NGO staff had no transport." }), /began, NGO staff/);
});

test("Section 2 has no summary card or AI rewrite; the statement is composed from the current answers", () => {
    assert.doesNotMatch(section2, /generateAISummary/);
    assert.doesNotMatch(section2, /Rewrite with AI from my current answers/);
    assert.doesNotMatch(section2, /<span className="cer-secn">2\.2<\/span>/);
    assert.doesNotMatch(section2, /data-testid="section2-baseline-statement"/);
    // Kept current on every answer change (no hand-edit guard: the statement is not editable any more).
    assert.match(section2, /if \(composed !== sectionData\.summary_text\) \{/);
    assert.equal(section2.includes("{sectionData.baseline_smart_draft}"), false);
});

test("a rewrite written from the current answers reads as fresh, and the legacy 2.2 draft never makes it stale", () => {
    const base = { problem_statement: "No lights.", affected_group: "students", affected_count: "26" };
    const written = { ...base, summary_text: "AI paragraph with 26.", summary_source: sectionSummarySource(base) };
    assert.equal(sectionSummarySync(written), "fresh");
    assert.equal(sectionSummarySync({ ...written, baseline_smart_draft: "Old local draft." }), "fresh");
    // Changing the count afterwards is what flags it.
    assert.equal(sectionSummarySync({ ...written, affected_count: "27" }), "stale");
});

test("fallback never lowercases 'I', acronyms or proper nouns; ordinary starters still flow after the lead-in", () => {
    assert.match(composeSection2SmartDraft({ problem: "I noticed the lights were broken." }), /^Before the project began, I noticed the lights were broken\.$/);
    assert.match(composeSection2SmartDraft({ problem: "Karachi's informal settlements had no clean water." }), /began, Karachi's informal settlements/);
    assert.match(composeSection2SmartDraft({ problem: "NGO staff had no transport." }), /began, NGO staff/);
    assert.match(composeSection2SmartDraft({ problem: "Our school had no library." }), /began, our school had no library\./);
    assert.match(composeSection2SmartDraft({ problem: "Children walked 4 km to school." }), /began, children walked 4 km/);
});
