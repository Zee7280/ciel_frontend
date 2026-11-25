import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const page = read("src/app/dashboard/faculty/fyp-thesis/page.tsx");
const ws = read("src/app/dashboard/student/paths/fyp-thesis/FypV9Workspace.tsx");
const studentRoute = read("src/app/dashboard/student/paths/fyp-thesis/[id]/page.tsx");

test("faculty FYP home has a 'Create Faculty FYP' card next to the three review cards", () => {
    assert.match(page, /const FYP_VIEWS = \["home", "progress", "pending", "approved", "rank", "mine"\] as const;/);
    assert.match(page, /href=\{`\$\{FYP_BASE\}\?view=mine`\}[\s\S]*?title="Create Faculty FYP"/);
    assert.match(page, /md:grid-cols-2 xl:grid-cols-4/);
    // The three existing review cards are untouched.
    for (const title of ["FYP in Progress", "FYP Review", "Approved FYP + AI Analyser Ranking"]) {
        assert.ok(page.includes(`title="${title}"`), title);
    }
});

test("'My Faculty FYPs' lists the faculty member's own records and creates one on the FYP deck", () => {
    assert.match(page, /data-ciel-faculty-fyp-mine/);
    assert.match(page, /authenticatedFetch\("\/api\/v1\/paths\/fyp-theses"\)/);
    assert.match(page, /authenticatedFetch\("\/api\/v1\/paths\/fyp-theses", \{ method: "POST"/);
    assert.match(page, /router\.push\(`\$\{FYP_BASE\}\/\$\{id\}`\)/);
    assert.match(page, /row\.status === "draft" && row\.id \?/, "only drafts can be deleted");
    const route = "src/app/dashboard/faculty/fyp-thesis/[id]/page.tsx";
    assert.ok(existsSync(new URL(`../${route}`, import.meta.url)));
    assert.match(read(route), /<FypV9Workspace id=\{params\.id\} mode="faculty" \/>/);
});

test("the FYP form in faculty mode: supervisor optional, Certify & publish instead of submit", () => {
    assert.match(ws, /mode = "student",/, "students keep the default");
    assert.match(studentRoute, /<FypV9Workspace id=\{params\.id\} \/>/, "student route unchanged");
    assert.match(ws, /facultyMode \? SECTION_ONE_REQUIRED\.filter\(\(\[key\]\) => !SUPERVISOR_FIELDS\.has\(key\)\) : SECTION_ONE_REQUIRED/);
    assert.match(ws, /required=\{!facultyMode\} anchor="supervisor"/);
    assert.match(ws, /required=\{!facultyMode\} anchor="supervisorEmail"/);
    assert.match(ws, /\/api\/v1\/paths\/fyp-theses\/\$\{id\}\/self-certify/);
    assert.match(ws, /const saved = await save\(8, buildSectionSummaries\(\)\);/, "faculty saves a draft, never status submitted");
    assert.match(ws, /facultyMode \? "Certify & publish my FYP →" : "Submit FYP record \+ flashcard for verification →"/);
    assert.match(ws, /if \(facultyMode\) void save\(undefined, undefined, "draft"\);/, "editing a certified FYP takes it back to draft");
    assert.match(ws, /const hubHref = facultyMode \? "\/dashboard\/faculty\/fyp-thesis\?view=mine" : "\/dashboard\/student\/paths\/fyp-thesis";/);
});
