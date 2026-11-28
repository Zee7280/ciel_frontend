import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as nav from "../src/app/dashboard/student/report/utils/reportWizardNav.ts";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const page = read("src/app/dashboard/student/report/page.tsx");
const chrome = read("src/app/dashboard/student/report/ReportFormChrome.tsx");
const s3 = read("src/app/dashboard/student/report/components/Section3SDGMapping.tsx");
const s4 = read("src/app/dashboard/student/report/components/Section4Streamlined.tsx");

test("no section calls the AI on Next any more", () => {
    assert.equal("dataSectionsToSummarize" in nav, false);
    assert.doesNotMatch(page, /generateAISummary|aiSummarizer/);
    assert.doesNotMatch(page, /auto-summary did not complete/);
});

test("only Section 1 keeps its summary card; steps 2–9 show none", () => {
    assert.match(page, /\{activeStep === 1 \? \(\s*<LiveBannerView step=\{activeStep\}/);
    assert.doesNotMatch(s3, /Preliminary SDG alignment statement/);
    assert.doesNotMatch(s4, /summary banner at the top of this step/);
    // Section 3's local statement is still stored with the report (reviewers, print view, AI evaluation).
    assert.match(s3, /updateSection\('section3', \{ summary_text: autoSummary, summary_source: section3SummarySource \}\)/);
});

test("one compiled summary is shown on the final step, before submit", () => {
    assert.match(page, /\{!postSubmitAwaitingReview && !ciiVerifiedSummaryLock \? \(\s*<ReportCompiledSummary/);
    assert.match(page, /onEdit=\{!isReadOnly && !stepperLockedToSummaryOnly \? goJourney : undefined\}/);
    assert.match(chrome, /Report summary — compiled from all sections/);
    // Flash-card mode is full-bleed: the card keeps to the package column like the other cards below it.
    assert.match(chrome, /<section data-ciel-compiled-summary className="cer-ipkg-below /);
    assert.match(chrome, /text: step === 1 \? participation : liveSectionSummary\(step, data, a\) \|\| "Not answered yet\."/);
    for (const title of ["Participation", "Project context", "SDG mapping", "Activities & outcomes", "Resources", "Partnerships", "Evidence", "Reflection", "Sustainability"]) {
        assert.match(chrome, new RegExp(`\\d: "${title}",`), title);
    }
});
