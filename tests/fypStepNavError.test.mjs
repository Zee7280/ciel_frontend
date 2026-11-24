import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const workspace = read("src/app/dashboard/student/paths/fyp-thesis/FypV9Workspace.tsx");
const ui = read("src/app/dashboard/student/paths/fyp-thesis/FypV9FormUi.tsx");

test("a refused FYP step press says why where the student is looking (toast + under the button), not only in the top banner", () => {
    // The helper every refusal goes through.
    assert.match(workspace, /const blockStep = \(message: string\) => \{\s*setError\(message\);\s*toast\.error\(message\);\s*\};/);
    // Section 1 "Connect project & build roadmap" refusals all use it — none is a silent setError any more.
    const start = workspace.indexOf("const completeSectionOne = async () => {");
    const end = workspace.indexOf("await goNext(1);", start);
    const body = workspace.slice(start, end);
    assert.ok(start > 0 && end > start);
    assert.match(body, /blockStep\(`Please complete: \$\{missing\.join\(", "\)\}`\)/);
    assert.doesNotMatch(body.replace("setError(null);", ""), /setError\(/, "no silent setError left in completeSectionOne");
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
