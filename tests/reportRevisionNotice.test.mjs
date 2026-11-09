// A report that CIEL PK (or faculty / the partner) sent back must say so on the student's report page.
// Before this, the only sign of a revision request there was that the form was editable again — the
// `ReportLifecycleBanner` that carried the note was exported but never rendered.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(path.join(root, p), "utf8");

const reportPage = read("src/app/dashboard/student/report/page.tsx");
const chrome = read("src/app/dashboard/student/report/ReportFormChrome.tsx");
const css = read("src/app/dashboard/student/report/community-engagement-report.css");
const impactPackage = read("src/app/dashboard/student/report/impact-package/ImpactPackage.tsx");

test("the report page renders the revision notice on every step, with the jump to the flash card", () => {
    assert.match(reportPage, /import \{[^}]*ReportRevisionNotice[^}]*\} from '\.\/ReportFormChrome'/);
    assert.match(reportPage, /<ReportRevisionNotice[\s\S]*?data=\{data\}[\s\S]*?onFlash=\{onFlash\}[\s\S]*?teamMemberOnly=\{isTeamMemberAttendanceOnly\}[\s\S]*?onGoFlash=\{\(\) => goJourney\(FLASH_CARD_STEP\)\}[\s\S]*?\/>/);
    // It sits outside the `!onFlash` blocks so the flash-card step shows it too.
    const at = reportPage.indexOf("<ReportRevisionNotice");
    const before = reportPage.slice(Math.max(0, at - 400), at);
    assert.doesNotMatch(before, /\{!onFlash \? \($/m);
});

test("the notice names the reviewer, shows their comments and only renders for a returned report", () => {
    const body = chrome.slice(chrome.indexOf("export function ReportRevisionNotice("));
    assert.match(body, /if \(!isReportReturnedForRevision\(data\)\) return null;/);
    assert.match(body, /sent this report back for changes/);
    assert.match(body, /reportRevisionNote\(data\)/);
    assert.match(body, /No written comments were attached/);
    assert.match(body, /Only the Team Lead can update the report and resubmit it\./);
    const reviewer = chrome.slice(chrome.indexOf("export function reportRevisionReviewer("), chrome.indexOf("export function reportRevisionNote("));
    assert.match(reviewer, /adm === "rejected"\) return "CIEL PK"/);
    assert.match(reviewer, /partner === "rejected"\) return "The partner organisation"/);
    assert.match(reviewer, /fac\.includes\("revision"\)[\s\S]*?return "Your faculty supervisor"/);
    const note = chrome.slice(chrome.indexOf("export function reportRevisionNote("), chrome.indexOf("export function ReportRevisionNotice("));
    assert.match(note, /data\.feedback \|\| data\.admin_feedback \|\| data\.faculty_remarks/);
});

test("the notice has its own attention tone and comment block styles", () => {
    assert.match(css, /\.cer \.cer-life-rev \{/);
    assert.match(css, /\.cer \.cer-life-note \{/);
});

test("the package tool bar stops saying 'Awaiting CIEL PK approval' once the report was sent back", () => {
    assert.match(impactPackage, /model\.returnedForRevision\s*\?\s*"Sent back for changes · resubmit to continue review"/);
});
