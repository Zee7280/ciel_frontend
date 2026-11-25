// Section 5 · Resources follows the V21 simple resource boxes (intro → 5.1 → 5.2 one box per resource,
// three steps each → 5.3 who gave what → AI-ready summary) on the same data model and submit rules.
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

test("the section blocks appear in the V21 order with the V21 wording", () => {
    const main = s6.slice(s6.indexOf("export default function Section6Resources"));
    inOrder(main, [
        "Section 5 of 11 — Resources",
        "What the project ran on 📦",
        "One box per resource.",
        'data-ciel-choice-card="use_resources:no"',
        'data-ciel-choice-card="use_resources:yes"',
        "Either answer is a good answer — a zero-budget project is a story worth telling too.",
        "data-ciel-resource-donut",
        "Add a resource and this chart fills itself.",
        "Each box needs who contributed it and one proof — that is what the rubric reads.",
        ">Your resources</h2>",
        'sectionTag("One box each")',
        "<ResourceBox",
        "Add another resource",
        ">Who gave what</h2>",
        'sectionTag("Automatic", true)',
        "Built from your boxes above — nothing to fill in here.",
        "Preview thank-you email",
        "Student team’s own contribution",
        "What happens after you submit?",
        "SECTION 5 · RESOURCES &amp; CONTRIBUTIONS · AI-READY SUMMARY",
        "Student-reported · pending review",
    ], "section");
    inOrder(main, ['"Resource pathway"', '"Who gave what"', '"Student team’s own contribution"', '"Cash in PKR and contributors"'], "summary lines");
    // V21 replaces the long source and verification chip lists with one question and two dropdowns.
    assert.doesNotMatch(s6, /Source · choose all that apply|Verification · choose all that apply/);
});

test("each resource box has three steps: the resource · who contributed it · proof, and folds away when done", () => {
    const box = s6.slice(s6.indexOf("function ResourceBox("), s6.indexOf("export default function Section6Resources"));
    inOrder(box, [
        '<details',
        'className="cer-rx-box"',
        "step${stepsLeft === 1 ? \"\" : \"s\"} to finish",
        "✓ Complete",
        'title="The resource"',
        "What was it?",
        "How much?",
        "<optgroup",
        "What did it make possible?",
        'title="Who contributed it?"',
        "Our student team",
        "Someone outside the team",
        "Both shared it",
        "Who are they?",
        "WhatsApp number",
        "Email",
        "They agreed to be named publicly. Their WhatsApp number and email always stay private.",
        'title="Proof"',
        "Upload a receipt, photo or letter",
        "What kind of proof is it?",
        "<ProofList",
        "What does this proof show?",
    ], "box");
    assert.match(s6, /No proof uploaded yet\./);
    // Finished boxes fold away when a new one is added; unseen boxes open only while incomplete.
    assert.match(s6, /prev\.filter\(\(idx\) => idx < resources\.length && boxIncomplete\(idx\)\), next\]/);
    assert.match(s6, /const toOpen = fresh\.filter\(boxIncomplete\);/);
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

test("who-contributed is one question; the stored sources and verification follow the answers (same keys, same submit rules)", () => {
    assert.match(s6, /data-ciel-contributor-state="choose-who"/);
    assert.match(s6, /data-ciel-contributor-state="student-funded"/);
    assert.match(s6, /data-ciel-contributor-state="outside"/);
    assert.match(s6, /contributed_by: next, sources: sourcesForContribution\(next, type, extras, row\.sources\)/);
    assert.match(s6, /verification: next \? \[next\] : \[\]/);
    for (const field of ["contributor_name", "contributor_org", "contributor_email", "contributor_phone_code", "contributor_phone", "contributor_public_recognition", "evidence_trail"]) {
        assert.match(s6, new RegExp(`onUpdate\\("${field}"|\\b${field}: `), field);
    }
    // Submit rules: the old checks stay, V21 adds the proof file and the organisation name.
    const validation = read(`${dir}/utils/validation.ts`);
    assert.match(validation, /isExternalResourceSource\(sources\)/);
    assert.match(validation, /Choose at least one verification method/);
    assert.match(validation, /field: `resources\.\$\{index\}\.proof`/);
    assert.match(validation, /field: `resources\.\$\{index\}\.contributor_org`/);
    assert.match(validation, /const hasUnlinkedProofs = /);
});

test("contributors are carried into Partnerships (6.3) as contributing partners, counted once when already a partner", () => {
    const s7 = read(`${dir}/components/Section7Partnerships.tsx`);
    inOrder(s7, [
        "data-ciel-contributing-partners",
        "Contributing partners · from Resources",
        "Everyone you named in Resources is carried here automatically",
        "counted once",
        "Edit in Resources",
        "Preview thank-you email",
        "No outside contributor has been named in Resources yet.",
        "How a contributor becomes a partner — what, how and when",
        "<ContributorThankYouPreview",
    ], "6.3");
    assert.match(s7, /groupContributors\(section6Resources,/);
    assert.match(s7, /linkedPartnerName\(g, has_partners === "yes" \? namedPartners : \[\]\)/);
    assert.match(s7, /onClick=\{\(\) => setStep\(5\)\}/);
    assert.match(s7, /\$\{contributingNote\}/);
    const preview = read(`${dir}/components/ContributorThankYouPreview.tsx`);
    assert.match(preview, /Preview only — nothing has been sent\./);
    assert.match(preview, /Certificate of Contribution/);
    assert.match(preview, /This acknowledges a contribution; it does not certify student service hours\./);
    const view = read(`${dir}/utils/resourceContributorsView.ts`);
    assert.match(view, /Thank you for supporting “\$\{ctx\.projectTitle\}” — your contribution summary \| CIEL PK/);
    assert.match(view, /\(same as partner \$\{link\}; counted once\)/);
});

test("V21 helpers: who-contributed is derived from the sources for older drafts, and the sources follow the answers", async () => {
    const m = await import("../src/app/dashboard/student/report/utils/resourceContributors.ts");
    assert.equal(m.contributedByFromSources(["Student Team"]), "team");
    assert.equal(m.contributedByFromSources(["Private Sponsor"]), "outside");
    assert.equal(m.contributedByFromSources(["Student Team", "Private Sponsor"]), "both");
    assert.equal(m.contributedByFromSources([]), "");
    // A stored answer that no longer fits the sources falls back to the sources.
    assert.equal(m.resourceContributedBy({ contributed_by: "team", sources: ["Private Sponsor"] }), "outside");
    assert.equal(m.resourceContributedBy({ contributed_by: "outside", sources: [] }), "outside");
    assert.equal(m.resourceContributedBy({ contributed_by: "both", sources: ["Student Team"] }), "both");
    assert.deepEqual(m.sourcesForContribution("team", "Private Sponsor"), ["Student Team"]);
    assert.deepEqual(m.sourcesForContribution("outside", "Private Sponsor"), ["Private Sponsor"]);
    assert.deepEqual(m.sourcesForContribution("both", "Corporate / CSR", [], ["Self-funded"]), ["Self-funded", "Corporate / CSR"]);
    assert.equal(m.contributorTypeOf({ sources: ["Student Team", "NGO / Nonprofit / Civil Society"] }), "NGO / Nonprofit / Civil Society");
    assert.deepEqual(m.extraContributorSources({ sources: ["Private Sponsor", "Crowdfunding"] }), ["Crowdfunding"]);
    assert.equal(m.contributorKindOf({ sources: ["Corporate / CSR"] }), "organization");
    assert.equal(m.contributorKindOf({ sources: ["Individual Donor"], contributor_org: "Shop" }), "individual");
    assert.equal(m.contributorKindOf({ sources: ["Private Sponsor"], contributor_org: "Shop" }), "organization");
    assert.equal(m.contributorOrgRequired({ sources: ["Government / Public Agency"] }), true);
    assert.equal(m.contributorOrgRequired({ sources: ["Private Sponsor"] }), false);
    assert.equal(m.contributorIdentity({ contributor_email: " A@x.org " }), "email|a@x.org");
});

test("one model per step: the resources donut lives in Section 5, not in the chrome above it", () => {
    const chrome = read(`${dir}/ReportFormChrome.tsx`);
    assert.doesNotMatch(chrome, /className="cer-resource-model"/);
    assert.match(chrome, /the donut inside Section 5, right after 5\.1/);
    const css = read(`${dir}/community-engagement-report.css`);
    for (const cls of ["cer-cr-intro", "cer-donut-wrap", "cer-donut-hole", "cer-v17-body", "cer-cr-table", "cer-ok", "cer-muted", "cer-proof", "cer-rx-box", "cer-rx-step", "cer-rx-who", "cer-rx-choice", "cer-rx-timeline", "cer-rx-mail", "cer-rx-cert"]) {
        assert.match(css, new RegExp(`\\.${cls}\\b`), cls);
    }
});

test("summary_text still travels with the report: legacy volunteer narrative for 'no', structured field lines for 'yes'", () => {
    assert.match(s6, /Resource Model: Volunteer-Based Implementation\. Total Verified Hours: \$\{verifiedHoursSnapshot\}h\. Financial Mobilization: 0\./);
    assert.match(s6, /summaryLines\.map\(\(\[h, t\]\) => `\$\{h\}: \$\{t\}`\)\.join\("\\n"\)/);
    assert.match(s6, /updateSection\("section6", \{ summary_text: autoNarrative \}\)/);
    assert.match(s6, /recorded cash \(other currencies and in-kind quantities kept separate\)/);
});
