import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const workspace = read("src/app/dashboard/student/paths/fyp-thesis/FypV9Workspace.tsx");
const ui = read("src/app/dashboard/student/paths/fyp-thesis/FypV9FormUi.tsx");

test("a refused FYP step press says why where the student is looking (toast + under the button), not only in the top banner", () => {
    // The helper every refusal goes through.
    assert.match(workspace, /const blockStep = \(message: string\) => \{\s*setError\(message\);\s*toast\.error\(message\);\s*\};/);
    // "Connect project & build roadmap" never refuses: Section 1 is checked once, on the final submit.
    const start = workspace.indexOf("const completeSectionOne = async () => {");
    const end = workspace.indexOf("await goNext(1);", start);
    const body = workspace.slice(start, end);
    assert.ok(start > 0 && end > start);
    assert.doesNotMatch(body, /blockStep\(|return;/, "step 1 button does not block");
    assert.match(body, /toast\.message\(`Saved\. Still needed before final submission: \$\{open\.join\(", "\)\}\.`\)/);
    // The final submit runs the Section 1 check, opens Section 1 and highlights / focuses the first gap.
    const sub = workspace.slice(workspace.indexOf("const submitRecord = async () => {"), workspace.indexOf('const ok = await save(8, buildSectionSummaries(), "submitted");'));
    assert.match(sub, /const blocker = sectionOneBlocker\(\);/);
    assert.match(sub, /setMissingFields\(blocker\.missing\);\s*blockStep\(`\$\{blocker\.message\} Section 1 is open below\.`\);\s*setStep\(0\);\s*window\.setTimeout\(\(\) => focusField\(blocker\.focus\), 60\);\s*return;/);
    const blocker = workspace.slice(workspace.indexOf("const sectionOneBlocker = ()"), workspace.indexOf("const completeSectionOne"));
    assert.match(blocker, /Before submitting, please complete in Section 1: \$\{missing\.map\(\(\[, label\]\) => label\)\.join\(", "\)\}\./);
    assert.match(blocker, /Before submitting, please add the group members in Section 1\./);
    assert.match(workspace, /data-ciel-fyp-field="team"/);
    assert.match(workspace, /blockStep\("Only the lead author can edit this FYP record\."\)/);
    // Every step button renders the reason right under itself.
    const navs = workspace.match(/<StepNav [^\n]*\/>/g) || [];
    assert.equal(navs.length, 7);
    for (const nav of navs) assert.match(nav, /error=\{error\}/, nav);
    assert.match(ui, /error\?: string \| null;/);
    assert.match(ui, /data-ciel-stepnav-error role="alert"/);
    // The toaster is mounted globally, so the toast actually shows.
    assert.match(read("src/app/layout.tsx"), /<Toaster /);
});

test("the empty Section 1 fields are highlighted, the first is scrolled into view, and the university comes from the profile", () => {
    // Every required Section 1 field carries an anchor the refusal can scroll to, in page order.
    for (const key of ["title", "university", "area", "discipline", "supervisor", "supervisorEmail", "route"]) {
        assert.match(workspace, new RegExp(`anchor="${key}" invalid=\\{fieldMissing\\("${key}"\\)`), key);
    }
    assert.match(workspace, /const SECTION_ONE_REQUIRED: \[string, string\]\[\] = \[\s*\["title", "FYP title"\],\s*\["university", "University"\],\s*\["area", "Academic area"\],\s*\["discipline", "Discipline"\],\s*\["supervisor", "Supervisor"\],\s*\["supervisorEmail", "Supervisor email"\],\s*\["route", "Primary FYP route"\],\s*\["routeOther", "Custom route description"\],/);
    // Highlight clears by itself once the field has a value.
    assert.match(workspace, /const fieldMissing = \(key: string\) => missingFields\.includes\(key\) && isSectionOneFieldEmpty\(key\);/);
    assert.match(workspace, /box\.scrollIntoView\(\{ behavior: "smooth", block: "center" \}\);/);
    assert.match(workspace, /input\?\.focus\(\{ preventScroll: true \}\)/);
    assert.match(ui, /data-ciel-fyp-field=\{anchor\}/);
    assert.match(ui, /ring-2 ring-red-300/);
    assert.match(ui, /Required — please fill this in before continuing\./);
    // A new record is created empty (POST {}), so the university is prefilled from the profile — and the hint now says so truthfully.
    assert.match(workspace, /if \(!data\.projectInfo\?\.university\?\.trim\(\) && data\.isOwner !== false\) \{\s*const fromProfile = profileUniversity\(\);/);
    assert.match(workspace, /return canonicalPakistaniUniversity\(stored\) \|\| stored;/);
    assert.match(workspace, /hint="Prefilled from your profile when it is set there — you can still edit it\."/);
    assert.doesNotMatch(workspace, /Auto-fills from your account when available/);
});
