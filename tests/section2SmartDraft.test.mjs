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

test("2.2 button rewrites the rubric's AI summary now (summary_text + summary_source), not a separate blue draft", () => {
    assert.match(section2, /generateAISummary\("section2", sectionData\)/);
    assert.match(section2, /const summarySource = sectionSummarySource\(sectionData\)/);
    assert.match(section2, /summary_text: result\.summary\.trim\(\),\s*summary_source: summarySource/);
    // The old local template and its separate preview box are gone; the legacy field is only cleared.
    assert.equal(section2.includes("generateSmartDraft"), false);
    assert.equal(section2.includes("{sectionData.baseline_smart_draft}"), false);
    assert.doesNotMatch(section2, /baseline_smart_draft: text/);
    assert.match(section2, /Rewrite with AI from my current answers/);
    // The student is told this is the paragraph the rubric reads and when it refreshes.
    assert.match(section2, /same paragraph as “AI summary — what the rubric will read”/);
    assert.match(section2, /Needs a rewrite/);
});

test("banner tells Section 2 students about the button; other steps keep the Next-only note", () => {
    assert.match(chrome, /aiRewriteHint="when you press Next on this step, or right away with “Rewrite with AI” under 2.2"/);
    assert.match(chrome, /DEFAULT_AI_REWRITE_HINT = "when you press Next on this step"/);
    assert.match(chrome, /aiSyncNoteText\(sync\.note, aiRewriteHint\)/);
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
