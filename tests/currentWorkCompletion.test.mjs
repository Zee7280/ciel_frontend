// Student dashboard hero: "overall current-work completion" averages only the paths the student
// started, so an approved Community Service record reads 100%, not 25% (or 6% with a pending seat).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { overallCurrentWorkCompletion } = await import(path.join(root, "src/utils/currentWorkCompletion.ts"));
const KEYS = ["communityService", "courseProject", "fypThesis", "startupBusiness"];
const idle = { state: "not_started", progress: 0 };

test("only started paths count", () => {
    const approvedCs = { communityService: { state: "complete", progress: 100 }, courseProject: idle, fypThesis: idle, startupBusiness: idle };
    assert.equal(overallCurrentWorkCompletion(approvedCs, KEYS), 100);
    const mixed = { ...approvedCs, courseProject: { state: "active", progress: 50 } };
    assert.equal(overallCurrentWorkCompletion(mixed, KEYS), 75);
});

test("nothing started or no data reads 0; odd values are clamped", () => {
    assert.equal(overallCurrentWorkCompletion({ communityService: idle, courseProject: idle, fypThesis: idle, startupBusiness: idle }, KEYS), 0);
    assert.equal(overallCurrentWorkCompletion(null, KEYS), 0);
    assert.equal(overallCurrentWorkCompletion({ communityService: { state: "active", progress: 140 } }, KEYS), 100);
    assert.equal(overallCurrentWorkCompletion({ communityService: { state: "active", progress: Number.NaN } }, KEYS), 0);
});

test("dashboard, impact portfolio and FYP hub share the helper", () => {
    for (const file of [
        "src/app/dashboard/student/page.tsx",
        "src/app/dashboard/student/impact/page.tsx",
        "src/app/dashboard/student/paths/fyp-thesis/FypThesisHub.tsx",
    ]) {
        const src = readFileSync(path.join(root, file), "utf8");
        assert.match(src, /overallCurrentWorkCompletion\(\w+\?\.pathsStatus, CIEL_PATHS\.map\(\(path\) => path\.key\)\)/, file);
        assert.doesNotMatch(src, /\/ \(CIEL_PATHS\.length \|\| 1\)/, `${file}: old all-paths average removed`);
    }
});
