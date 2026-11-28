import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const R = "src/app/dashboard/student/report/";
const s6 = read(`${R}components/Section6Resources.tsx`);
const s7 = read(`${R}components/Section7Partnerships.tsx`);
const upload = read(`${R}utils/evidenceUpload.ts`);
const validation = read(`${R}utils/validation.ts`);

test("each resource proof can carry its own optional note, kept through upload", () => {
    assert.match(s6, /"Add a note about this proof \(optional\)"/);
    assert.match(s6, /maxLength=\{240\}/);
    assert.match(s6, /onNote=\{onProofNote\}/);
    assert.match(s6, /onProofNote=\{setProofNote\}/);
    // A new upload keeps both the box link and the note.
    assert.match(upload, /if \(typeof item\.resource_index === "number"\) kept\.resource_index = item\.resource_index;/);
    assert.match(upload, /if \(typeof item\.note === "string" && item\.note\.trim\(\)\) kept\.note = item\.note;/);
});

test("a non-cash outside contribution can record an optional estimated PKR value and how it was valued", () => {
    assert.match(s6, /\{unit && !isCashResource\(row\) \? \(/);
    assert.match(s6, /"Add an estimated PKR value \(optional\)"/);
    assert.match(s6, /How was it valued\?/);
    // Only checked once entered: positive amount + a valuation basis.
    assert.match(validation, /const valueText = String\(row\.contributor_value_pkr \?\? ''\)\.trim\(\);\s*if \(valueText\) \{/);
    assert.match(validation, /field: `resources\.\$\{index\}\.contributor_value_basis`/);
});

test("Partnerships: V21 ecosystem note, without promising a dashboard link the backend does not make", () => {
    assert.match(s7, /Bringing your partner into the CIEL PK ecosystem\./);
    assert.match(s7, /a community elder, an NGO or a large organization/);
    assert.doesNotMatch(s7, /automatically attaches this opportunity/);
    assert.doesNotMatch(s7, /LINKS THEIR DASHBOARD/);
});
