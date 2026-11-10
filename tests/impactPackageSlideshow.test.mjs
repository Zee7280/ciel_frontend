// Evidence gallery slideshow in the in-app Impact Package: Open slideshow, previous / next with
// wrap-around over the listed files, arrow keys and Escape, and a "n of N" counter.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(path.join(root, "src/app/dashboard/student/report/impact-package/ImpactPackage.tsx"), "utf8");

test("the evidence viewer steps through the listed files with wrap-around", () => {
    assert.match(src, /setPreview\(slideFiles\[\(slideIndex \+ delta \+ slideFiles\.length\) % slideFiles\.length\]\)/);
    assert.match(src, /event\.key === "ArrowLeft"\) stepSlide\(-1\)/);
    assert.match(src, /event\.key === "ArrowRight"\) stepSlide\(1\)/);
    assert.match(src, /event\.key === "Escape"\) setPreview\(null\)/);
    assert.match(src, /\$\{slideIndex \+ 1\} of \$\{slideFiles\.length\}/);
});

test("Open slideshow starts at the first listed file and respects locked evidence", () => {
    assert.match(src, /disabled=\{!filesVisible \|\| filteredFiles\.length === 0\}/);
    assert.match(src, /onClick=\{\(\) => setPreview\(filteredFiles\[0\] \?\? null\)\}/);
    assert.match(src, /\{preview && filesVisible \? \(/, "the viewer never opens for locked evidence");
});
