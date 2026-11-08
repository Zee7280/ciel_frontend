// "3 FILES" must open all three. The old buttons linked (or window.open-ed) only the last
// deliverable, so every FYP card now goes through FypFilesButton, which lists every file.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(path.join(root, p), "utf8");

const hub = read("src/app/dashboard/student/paths/fyp-thesis/FypThesisHub.tsx");
const faculty = read("src/components/ciel/FacultyFypFlashcard.tsx");
const button = read("src/components/ciel/FypFilesButton.tsx");

test("no FYP card links only the latest deliverable any more", () => {
    for (const [name, src] of [["FypThesisHub", hub], ["FacultyFypFlashcard", faculty]]) {
        assert.doesNotMatch(src, /href=\{latestFile\.fileUrl\}/, `${name} still links latestFile directly`);
        assert.doesNotMatch(src, /deliverables\[files - 1\]\.fileUrl/, `${name} still links the last deliverable`);
        assert.doesNotMatch(src, /window\.open\(withUrl\[0\]/, `${name} still window.opens one file`);
        assert.match(src, /import FypFilesButton from "@\/components\/ciel\/FypFilesButton";/);
    }
    // student: review card + approved card; faculty / university / admin: modal footer, approved card, review card, list row
    assert.equal((hub.match(/<FypFilesButton/g) || []).length, 2);
    // faculty / university / admin: review-queue card, modal footer, approved card, review card, list row
    assert.equal((faculty.match(/<FypFilesButton/g) || []).length, 5);
});

test("the Evidence Locker lists every upload with a Remove action on drafts, calling the DELETE route", () => {
    const ws = read("src/app/dashboard/student/paths/fyp-thesis/FypV9Workspace.tsx");
    assert.match(ws, /data-testid="fyp-evidence-list"/);
    assert.match(ws, /data-testid="fyp-evidence-remove"/);
    assert.match(ws, /const canRemove = isOwner && \(entry\.status !== "submitted" \|\| editing\);/);
    assert.match(ws, /`\/api\/v1\/paths\/fyp-theses\/\$\{id\}\/deliverables\/\$\{version\}`,\s*\{ method: "DELETE" \}/);
    assert.match(ws, /window\.confirm\(`Remove "\$\{label\}" from this FYP record\?`\)/);
    // No more "latest per label" grouping that hid earlier uploads from the student.
    assert.doesNotMatch(ws, /groupedFiles/);
});

test("AI headline / summaries render the stored HTML as text (no raw <b> tags on cards)", () => {
    assert.match(faculty, /stripInlineHtml\(entry\.sectionSummaries\?\.project\)/);
    assert.match(hub, /stripInlineHtml\(entry\.sectionSummaries\?\.project\)/);
    const portfolio = read("src/app/dashboard/student/impact/StudentImpactPortfolioTable.tsx");
    assert.match(portfolio, /stripInlineHtml\(fypEntry\.sectionSummaries\?\.project\)/);
    const types = read("src/utils/fypTypes.ts");
    assert.match(types, /export function stripInlineHtml/);
});

test("FypFilesButton lists every version of every deliverable and opens a lone file directly", () => {
    assert.match(button, /groupFypDeliverablesByLabel\(files\)/);
    assert.match(button, /earlier\.map\(\(f\) => \(/);
    assert.match(button, /data-testid="fyp-files-list"/);
    assert.match(button, /const single = count === 1 && list\[0\]\?\.fileUrl \? list\[0\] : null;/);
    // Every row's link opens in a new tab without leaking the opener.
    assert.match(button, /target="_blank"\s+rel="noopener noreferrer"/);
});
