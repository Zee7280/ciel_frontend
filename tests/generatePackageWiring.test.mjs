// Guards the student "Generate my Package" → "Submit package" wiring against the regression where it
// lived in a component the report page no longer renders (Section11Summary's default export).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(path.join(root, p), "utf8");

const reportPage = read("src/app/dashboard/student/report/page.tsx");
const chrome = read("src/app/dashboard/student/report/ReportFormChrome.tsx");
const impactPackage = read("src/app/dashboard/student/report/impact-package/ImpactPackage.tsx");
const generate = read("src/app/dashboard/student/report/impact-package/GenerateMyPackage.tsx");
const section11 = read("src/app/dashboard/student/report/components/Section11Summary.tsx");

test("the report page's flashcard step renders ReportFlashCard with the submit gate and handler", () => {
    assert.match(reportPage, /<ReportFlashCard[\s\S]*?canSend=\{[\s\S]*?onSend=\{[\s\S]*?handleSubmit[\s\S]*?\/>/);
});

test("ReportFlashCard hands the submit controls to ImpactPackage instead of discarding them", () => {
    const body = chrome.slice(chrome.indexOf("export function ReportFlashCard("));
    assert.match(body, /<ImpactPackage[\s\S]*?audience="student"[\s\S]*?submit=\{\{\s*canSend: canSend === true, onSend, sending: sending === true\s*\}\}/);
    assert.doesNotMatch(body, /void onSend;/);
    assert.doesNotMatch(body, /void canSend;/);
});

test("ImpactPackage renders GenerateMyPackage only for the student audience when submit controls exist", () => {
    assert.match(impactPackage, /audience !== "student" \|\| !submit\s*\?\s*null/);
    assert.match(impactPackage, /model\.adminApproved \|\| typeof submit\.onSend !== "function"\s*\?\s*"none"/);
    assert.match(impactPackage, /submit\.canSend\s*\?\s*"ready"\s*:\s*"blocked"/);
    assert.match(impactPackage, /\{studentSubmitMode \? \(\s*<GenerateMyPackage/);
});

test("Submit package only fires in ready mode, after the viewer loaded, and reuses the page's confirmation", () => {
    assert.match(generate, /const canSubmit = submitMode === "ready" && typeof onSubmit === "function";/);
    assert.match(generate, /disabled=\{!canSubmit \|\| !ready \|\| submitting\}/);
    assert.match(generate, /if \(!canSubmit\) return;[\s\S]*?onSubmit\?\.\(\);/);
    // The student's pre-submit check shows every tab.
    assert.match(generate, /previewAll: true/);
});

test("Section11Summary (not rendered by the report page) does not carry a second copy of the flow", () => {
    assert.doesNotMatch(section11, /GenerateMyPackage/);
    assert.doesNotMatch(reportPage, /<Section11Summary\b/);
});
