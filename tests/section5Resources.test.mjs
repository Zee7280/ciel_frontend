// Section 5 · Resources follows the V19 streamlined flow (intro → 5.1 → donut → 5.2 → 5.3 → AI-ready
// summary) on the same data model and submit rules as before.
// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(path.join(root, p), "utf8");
const dir = "src/app/dashboard/student/report";
const s6 = read(`${dir}/components/Section6Resources.tsx`);

const inOrder = (haystack, markers, label) => {
    let cursor = 0;
    for (const marker of markers) {
        const at = haystack.indexOf(marker, cursor);
        assert.ok(at >= 0, `${label}: missing or out of order: ${marker}`);
        cursor = at;
    }
};

test("the section blocks appear in the V19 order with the V19 wording", () => {
    const main = s6.slice(s6.indexOf("export default function Section6Resources"));
    inOrder(main, [
        "Section 5 of 11 — Resources",
        "What the project ran on 📦",
        "Every contribution has a person behind it.",
        "1 · Record support",
        "4 · Thank &amp; recognize",
        'data-ciel-choice-card="use_resources:no"',
        'data-ciel-choice-card="use_resources:yes"',
        "Either answer is a good answer — a zero-budget project is a story worth telling too.",
        "data-ciel-resource-donut",
        "Add resource entries and this chart fills itself.",
        "Every entry needs a source and a verification — that is what the rubric reads.",
        ">Resource entries</h2>",
        "PKR 8,000 total = PKR 3,000 from the student team + PKR 5,000 from a named sponsor.",
        "<ResourceCard",
        "Add resource entry",
        ">Contributor register</h2>",
        "Links to Partnerships",
        "Outside contributors will appear here as you record their support.",
        "SECTION 5 · RESOURCES &amp; CONTRIBUTIONS · AI-READY SUMMARY",
        "Student-reported · pending review",
    ], "section");
    inOrder(main, ['"Resource pathway"', '"Cash in PKR and contributors"'], "summary lines");
});

test("each resource entry reads top to bottom like the V19 card", () => {
    const card = s6.slice(s6.indexOf("function ResourceCard("), s6.indexOf("export default function Section6Resources"));
    inOrder(card, [
        "Resource type",
        "Choose resource type…",
        "Amount / quantity",
        "Unit",
        "What did it make possible?",
        "Source · choose all that apply",
        "Verification · choose all that apply",
        "Choose the source above to record who contributed.",
        "Student-funded resource · credited to the student team.",
        "Who contributed this resource?",
        "Upload proof of this contribution",
        "<ProofList",
    ], "entry card");
    assert.match(s6, /No proof uploaded yet\./);
});

test("choosing 'We used resources' opens the first entry; removing an entry keeps proofs with their entries", () => {
    assert.match(s6, /if \(value === "yes" && resources\.length === 0\) patch\.resources = \[emptyResource\(\)\];/);
    assert.match(s6, /\.filter\(\(file\) => proofEntryIndex\(file\) !== i\)/);
    assert.match(s6, /resource_index: at - 1/);
});

test("proofs are uploaded per entry and keep their entry link through save / upload", () => {
    assert.match(s6, /function toProofRecord\(file: File, resourceIndex: number\)/);
    assert.match(s6, /resource_index: resourceIndex/);
    const upload = read(`${dir}/utils/evidenceUpload.ts`);
    assert.match(upload, /typeof item\.resource_index === "number"/);
    assert.match(upload, /return \{ \.\.\.uploaded, resource_index: item\.resource_index \};/);
    const ctx = read(`${dir}/context/ReportContext.tsx`);
    assert.match(ctx, /export type ReportResourceProofFile/);
    assert.match(ctx, /evidence_files: Array<File \| ReportResourceProofFile>;/);
    // Files saved before linking are still shown, previewable, linkable and removable.
    assert.match(s6, /data-ciel-unlinked-proofs/);
    assert.match(s6, /Link to entry…/);
});

test("who-contributed follows the source: nothing chosen → prompt; team-funded → credited note; outside → contributor fields (same stored keys, same submit rules)", () => {
    assert.match(s6, /data-ciel-contributor-state="choose-source"/);
    assert.match(s6, /data-ciel-contributor-state="student-funded"/);
    assert.match(s6, /data-ciel-contributor-state="outside"/);
    for (const field of ["contributor_name", "contributor_email", "contributor_phone_code", "contributor_phone", "evidence_trail"]) {
        assert.match(s6, new RegExp(`onUpdate\\("${field}"`), field);
    }
    // Submit rules untouched on both sides.
    const validation = read(`${dir}/utils/validation.ts`);
    assert.match(validation, /isExternalResourceSource\(sources\)/);
    assert.match(validation, /Choose at least one verification method/);
});

test("one model per step: the resources donut lives in Section 5, not in the chrome above it", () => {
    const chrome = read(`${dir}/ReportFormChrome.tsx`);
    assert.doesNotMatch(chrome, /className="cer-resource-model"/);
    assert.match(chrome, /the donut inside Section 5, right after 5\.1/);
    const css = read(`${dir}/community-engagement-report.css`);
    for (const cls of ["cer-cr-intro", "cer-donut-wrap", "cer-donut-hole", "cer-v17-body", "cer-cr-table", "cer-ok", "cer-muted", "cer-proof"]) {
        assert.match(css, new RegExp(`\\.${cls}\\b`), cls);
    }
});

test("summary_text still travels with the report: legacy volunteer narrative for 'no', structured field lines for 'yes'", () => {
    assert.match(s6, /Resource Model: Volunteer-Based Implementation\. Total Verified Hours: \$\{verifiedHoursSnapshot\}h\. Financial Mobilization: 0\./);
    assert.match(s6, /summaryLines\.map\(\(\[h, t\]\) => `\$\{h\}: \$\{t\}`\)\.join\("\\n"\)/);
    assert.match(s6, /updateSection\("section6", \{ summary_text: autoNarrative \}\)/);
    assert.match(s6, /recorded cash \(other currencies and in-kind quantities kept separate\)/);
});
