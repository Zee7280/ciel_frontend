// QA sweep (22 Nov) — the submit gates match the V19 form: SDG cap of two additional goals
// (FT-04/05), partner type stays Recommended, reflections 40–100 / 25–70, evidence caption
// optional up to 45 words (FT-08), resource amounts > 0, mixed-source shares (FT-06), 25 MB proofs.
// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(path.join(root, p), "utf8");
const dir = "src/app/dashboard/student/report";
const validation = read(`${dir}/utils/validation.ts`);
const s3 = read(`${dir}/components/Section3SDGMapping.tsx`);
const s6 = read(`${dir}/components/Section6Resources.tsx`);
const s8 = read(`${dir}/components/Section8Evidence.tsx`);
const s9 = read(`${dir}/components/Section9Reflection.tsx`);
const backend = read("../ciel_backend/src/reports/report-submit-validation.util.ts");

const { MAX_ADDITIONAL_SDGS, additionalStudentSdgCount, secondarySdgSlots, studentPrimaryIsAdditional } =
    await import("../src/app/dashboard/student/report/utils/sdgAdditionalCap.ts");
const { isMixedResourceSource, resourceAmountNumber, contributorShareOf } =
    await import("../src/app/dashboard/student/report/utils/resourceContributors.ts");
const { MAX_RESOURCE_PROOF_BYTES, splitReportFilesBySize } =
    await import("../src/app/dashboard/student/report/utils/fileUploadLimits.ts");

test("FT-04 · two additional goals in total; the student primary counts once the opportunity has a registered primary", () => {
    assert.equal(MAX_ADDITIONAL_SDGS, 2);
    const base = { registered_primary_goal: 4, primary_sdg: { goal_number: 12 }, secondary_sdgs: [{ goal_number: 11 }, { goal_number: 13 }] };
    assert.equal(studentPrimaryIsAdditional(base), true);
    assert.equal(additionalStudentSdgCount(base), 3);
    assert.equal(secondarySdgSlots(base), 1);
    // No registered primary → the student primary is the report's primary, not an extra.
    assert.equal(additionalStudentSdgCount({ ...base, registered_primary_goal: null }), 2);
    assert.equal(secondarySdgSlots({ ...base, registered_primary_goal: null }), 2);
    // A student primary that duplicates a registered goal is merged, so it is not an extra either.
    assert.equal(additionalStudentSdgCount({ ...base, primary_sdg: { goal_number: 4 } }), 2);
    assert.equal(additionalStudentSdgCount({ ...base, registered_secondary_contributions: { 12: "" } }), 2);
    // Both gates carry the rule and the same message.
    assert.match(validation, /additionalStudentSdgCount\(data\)/);
    assert.match(validation, /at most \$\{MAX_ADDITIONAL_SDGS\} in total/);
    assert.match(backend, /export function additionalStudentSdgCount/);
    assert.match(backend, /at most \$\{MAX_ADDITIONAL_SDGS\} in total/);
});

test("FT-04/05 · Section 3 seeds the registered primary, caps the add button and tells registered from taken tiles", () => {
    assert.match(s3, /registered_primary_goal: seeded/);
    assert.match(s3, /secondary_sdgs\.length < secondarySlots \?/);
    assert.match(s3, /\$\{\(secondary_sdgs \|\| \[\]\)\.length\} of \$\{secondarySlots\} added/);
    // Seeding the registered goals is a system write: it must not wipe submit errors just revealed.
    assert.match(s3, /registered_primary_goal: seeded \}, \{ keepErrors: true \}/);
    assert.match(s3, /registered_secondary_contributions: next \}, \{ keepErrors: true \}/);
    assert.match(read(`${dir}/context/ReportContext.tsx`), /if \(!options\?\.keepErrors\) clearValidationErrors\(section\);/);
    assert.match(s3, /data-ciel-sdg-cap-warning/);
    assert.match(s3, /getFieldError\("secondary_sdgs"\)/);
    // The padlock is only for goals registered on the opportunity; a goal mapped elsewhere in 3.2 is "taken".
    assert.match(s3, /registeredIds\?: string\[\]/);
    assert.match(s3, /takenIds\?: string\[\]/);
    assert.match(s3, /already mapped in 3\.2 — student-added, not registered/);
    assert.doesNotMatch(s3, /disabledIds=\{/);
    const css = read(`${dir}/community-engagement-report.css`);
    assert.match(css, /\.cer-sdg-tile\.taken::after \{\s*content: "mapped"/);
});

test("Section 6 · partner type is Recommended on the card, so neither gate demands it; the contribution line keeps its wording", () => {
    assert.doesNotMatch(validation, /Partner type is required/);
    assert.doesNotMatch(backend, /partner type is required/);
    assert.match(validation, /say what this partner contributed, in one line/);
    assert.match(backend, /say what this partner contributed, in one line/);
    // "Other" must still be spelled out.
    assert.match(validation, /partners\.\$\{index\}\.type_other/);
    assert.match(backend, /partners\.\$\{index\}\.type_other/);
});

test("Section 8 · the reflections are gated on the ranges the meters show", () => {
    assert.match(validation, /personal_learning: \{ min: 40, max: 100 \}/);
    assert.match(validation, /academic_application: \{ min: 25, max: 70 \}/);
    assert.match(backend, /personal_learning: \{ min: 40, max: 100 \}/);
    assert.match(backend, /academic_application: \{ min: 25, max: 70 \}/);
    assert.match(s9, /words · required 40–100/);
    assert.match(s9, /words · required 25–70/);
    assert.doesNotMatch(s9, /recommended 40–100|recommended 25–70/);
});

test("FT-08 · the evidence caption is optional and capped at 45 words; a pending public choice reads as restricted", () => {
    assert.match(validation, /evidence_caption: \{ min: 0, max: 45 \}/);
    assert.match(validation, /'What does your evidence show\?', false, 'evidence_caption'/);
    assert.match(validation, /min === 0 \? `up to \$\{max\} words`/);
    assert.match(backend, /evidence_caption: \{ min: 0, max: 45 \}/);
    assert.match(backend, /min === 0 \? `up to \$\{max\} words`/);
    assert.match(s8, /Optional · up to 45 words/);
    assert.doesNotMatch(s8, /Required · 10–45 words/);
    assert.match(s8, /public requested — treated as restricted until public-share permission is confirmed/);
});

test("Section 5 · amounts must be > 0 and a mixed source splits into student-team + contributor shares that reconcile", () => {
    assert.equal(resourceAmountNumber("8,000"), 8000);
    assert.equal(resourceAmountNumber(" -1 "), -1);
    assert.equal(resourceAmountNumber("about 50"), null);
    assert.equal(isMixedResourceSource(["Student Team", "Private Sponsor"]), true);
    assert.equal(isMixedResourceSource(["Private Sponsor"]), false);
    assert.equal(isMixedResourceSource(["Student Team", "Self-funded"]), false);
    const mixed = { amount: "8000", student_team_share: "3000", sources: ["Student Team", "Private Sponsor"] };
    assert.equal(contributorShareOf(mixed), 5000);
    assert.equal(contributorShareOf({ ...mixed, student_team_share: "" }), null);
    assert.equal(contributorShareOf({ ...mixed, student_team_share: "9000" }), null);
    assert.equal(contributorShareOf({ amount: "50", sources: ["Individual Donor"] }), 50);
    // Gates.
    assert.match(validation, /Enter an amount greater than 0/);
    assert.match(backend, /Enter an amount greater than 0/);
    assert.match(validation, /Record the student team's share in the same unit \(enter 0 if none\)/);
    assert.match(backend, /Record the student team's share in the same unit \(enter 0 if none\)/);
    assert.match(validation, /cannot exceed the resource total/);
    assert.match(backend, /cannot exceed the resource total/);
    // Form: the share block sits inside the outside-contributor state and the register uses the share.
    const card = s6.slice(s6.indexOf("function ResourceCard"), s6.indexOf("export default function Section6Resources"));
    assert.match(card, /data-ciel-contributor-state="outside"/);
    assert.match(card, /data-ciel-resource-shares=\{idx\}/);
    assert.match(card, /Student team’s share/);
    assert.match(card, /data-ciel-share-reconcile=/);
    assert.match(s6, /const amt = contributorShareOf\(r\);/);
    assert.match(s6, /Student team share: /);
    // The backend contributor acknowledgement credits the share, not the total.
    const svc = read("../ciel_backend/src/resource-contributors/resource-contributors.service.ts");
    assert.match(svc, /amount: contributorShareText\(res\)/);
});

test("Section 5 · proof of a contribution is capped at 25 MB per file (V19), other evidence keeps its own limit", () => {
    assert.equal(MAX_RESOURCE_PROOF_BYTES, 25 * 1024 * 1024);
    const small = { name: "a.pdf", size: 1024 };
    const big = { name: "b.pdf", size: 26 * 1024 * 1024 };
    const split = splitReportFilesBySize([small, big], MAX_RESOURCE_PROOF_BYTES);
    assert.deepEqual(split.accepted.map((f) => f.name), ["a.pdf"]);
    assert.deepEqual(split.rejected.map((f) => f.name), ["b.pdf"]);
    assert.match(s6, /filterOversizedProofs\(picked, input\)/);
    assert.match(s6, /Max \{MAX_RESOURCE_PROOF_LABEL\} per file/);
    assert.doesNotMatch(s6, /MAX_REPORT_UPLOAD_LABEL/);
});
