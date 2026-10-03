import assert from "node:assert/strict";
import test from "node:test";
import { ORG_SKILL_PRESETS, STUDENT_SKILL_PRESETS, splitCustomValues } from "./opportunityChipOptions";

test("custom values are split out of the stored array, order preserved", () => {
    const r = splitCustomValues(["Leadership", "Beekeeping", "Teaching", "Pottery"], ORG_SKILL_PRESETS);
    assert.deepEqual(r.known, ["Leadership", "Teaching"]);
    assert.deepEqual(r.custom, ["Beekeeping", "Pottery"]);
});

test("a bare 'Other' placeholder and blanks are dropped, non-arrays are safe", () => {
    assert.deepEqual(splitCustomValues(["Other", " ", "Research"], ORG_SKILL_PRESETS), { known: ["Research"], custom: [] });
    assert.deepEqual(splitCustomValues(undefined, ORG_SKILL_PRESETS), { known: [], custom: [] });
    assert.deepEqual(splitCustomValues("x", ORG_SKILL_PRESETS), { known: [], custom: [] });
});

test("student presets are a superset of the org presets", () => {
    for (const s of ORG_SKILL_PRESETS) assert.ok((STUDENT_SKILL_PRESETS as readonly string[]).includes(s), s);
});
