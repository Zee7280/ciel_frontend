import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const R = "src/app/dashboard/student/report/";

test("auto-written summaries never wipe the submit errors just revealed (Fix Step 2 / 3 keeps them)", () => {
    assert.match(read(`${R}components/Section2ProjectContext.tsx`), /updateSection\('section2', patch, \{ keepErrors: true \}\);/);
    assert.match(read(`${R}components/Section3SDGMapping.tsx`), /summary_source: section3SummarySource \}, \{ keepErrors: true \}\)/);
});

test("Sections 4 and 5 keep a summary written from the answers (print view, reviewers, AI evaluation)", () => {
    const s4 = read(`${R}components/Section4Streamlined.tsx`);
    assert.match(s4, /const section5Summary = `Results and evidence: \$\{summary\.resultsText\}\\nChallenges and limitations: \$\{summary\.challengesText\}`;/);
    assert.match(s4, /updateSection\("section4", \{ summary_text: summary\.text \}, \{ keepErrors: true \}\)/);
    assert.match(s4, /updateSection\("section5", \{ summary_text: section5Summary \}, \{ keepErrors: true \}\)/);
});

test("backend keeps the wizard's Section 3 statement (all SDGs); fills one only when none was sent", () => {
    const svc = read("../ciel_backend/src/reports/student-reports.service.ts");
    assert.match(svc, /report\.contribution_intent_statement &&\s*!String\(report\.section3\?\.summary_text \?\? ''\)\.trim\(\)/);
});
