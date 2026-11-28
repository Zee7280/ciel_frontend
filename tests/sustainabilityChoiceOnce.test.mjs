import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), "utf8");

test("step 9: the continue / partly / stops choice shows once, as the clickable 9.1 cards", () => {
    const s10 = read("src/app/dashboard/student/report/components/Section10Sustainability.tsx");
    assert.match(s10, /continuationOptions\.map\(/);
    assert.match(s10, /onClick=\{\(\) => update\("continuation_status", opt\.id\)\}/);
    assert.doesNotMatch(s10, /ladderOptions/);
    const chrome = read("src/app/dashboard/student/report/ReportFormChrome.tsx");
    assert.doesNotMatch(chrome, /cer-ladder/);
    assert.doesNotMatch(chrome, /const rungs/);
});
