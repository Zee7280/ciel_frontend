// Admin compact Detailed report: entry lists become tables, short answers share a grid, unanswered
// questions fold into one line, and no answer text is lost in the process.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = "src/app/dashboard/student/report/impact-package";
const { COMPACT_TABLE_PREVIEW_ROWS, compactCellText, isCompactDetailedReportAudience, compactTable, isCompactShortAnswer, splitCompactRows } = await import(
    path.join(root, dir, "detailedReportCompact.ts")
);

test("session logs become one table row each, dropping columns no entry answered", () => {
    const sessions = [
        { date: "2026-05-04", hours: "4", location: "Lahore", description: "Painted two classrooms", status: "Logged", extra: "" },
        { date: "2026-05-05", hours: "3", location: "Not supplied", description: "Repaired desks", status: "Approved", extra: "" },
    ];
    const table = compactTable(sessions);
    assert.deepEqual(table.columns.map((c) => c.label), ["Date", "Hours", "Location", "Description", "Status"]);
    assert.deepEqual(table.rows[0], ["2026-05-04", "4", "Lahore", "Painted two classrooms", "Logged"]);
    assert.equal(table.rows[1][2], "—", "a blank cell shows a dash, not 'Not supplied'");
    assert.equal(table.rows.length, 2);
});

test("cells flatten lists and nested values without losing text", () => {
    assert.equal(compactCellText(["cash_donation", "in_kind"]), "Cash Donation, In Kind");
    assert.equal(compactCellText(true), "Yes");
    assert.equal(compactCellText(false), "No");
    assert.equal(compactCellText({ name: "A", access: "Locked" }), "Name: A · Access: Locked");
    assert.equal(compactTable(["a", "b"]), null, "a plain list is not a table");
    assert.equal(compactTable("text"), null);
    assert.equal(compactTable([]), null);
});

test("short answers share the grid; long text and record lists take the full width", () => {
    assert.equal(isCompactShortAnswer("Lahore"), true);
    assert.equal(isCompactShortAnswer(4), true);
    assert.equal(isCompactShortAnswer(true), true);
    assert.equal(isCompactShortAnswer(["Photos", "Videos"]), true);
    assert.equal(isCompactShortAnswer("x".repeat(200)), false);
    assert.equal(isCompactShortAnswer([{ a: "1" }]), false);
});

test("unanswered questions fold into one line; answered rows keep their order", () => {
    const rows = [
        { question: "Full name", answer: "Zain", origin: "Source record", source_path: "" },
        { question: "Semester", answer: "Not supplied", origin: "Not supplied", source_path: "" },
        { question: "Skills", answer: [], origin: "Not supplied", source_path: "" },
        { question: "Privacy consent", answer: false, origin: "Source record", source_path: "" },
        { question: "University", answer: "BNU", origin: "Source record", source_path: "" },
    ];
    const { answered, unanswered } = splitCompactRows(rows);
    assert.deepEqual(answered.map((r) => r.question), ["Full name", "Privacy consent", "University"]);
    assert.deepEqual(unanswered, ["Semester", "Skills"]);
});

test("long tables preview a few rows; every viewer reads the compact layout", () => {
    assert.ok(COMPACT_TABLE_PREVIEW_ROWS >= 5 && COMPACT_TABLE_PREVIEW_ROWS <= 10);
    for (const a of ["admin", "student", "faculty", "university", "partner", "public"]) {
        assert.equal(isCompactDetailedReportAudience(a), true, a);
    }
    for (const a of ["", undefined, "other"]) assert.equal(isCompactDetailedReportAudience(a), false, String(a));
    const src = readFileSync(path.join(root, dir, "ImpactPackageDetailedReport.tsx"), "utf8");
    assert.match(src, /const compact = isCompactDetailedReportAudience\(audience\);/);
    assert.match(src, /!compact && rows\.map/, "other viewers keep the full dossier rows");
    assert.match(src, /showAll=\{Boolean\(query\.trim\(\)\)\}/, "a search shows every matching table row");
});
