// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { impactPoints } from "../src/utils/quickImpactPoints.ts";

test("highlights split on new lines and sentence ends, without the final full stop", () => {
    assert.deepEqual(impactPoints("We ran a desk. Shared leaflets!\nGuided visitors?"), ["We ran a desk", "Shared leaflets", "Guided visitors"]);
});

test("titles and e.g. / i.e. do not break a sentence; decimals stay whole", () => {
    assert.deepEqual(impactPoints("Dr. Khan led the desk. We reached 10.5 km, e.g. the ring road."), ["Dr. Khan led the desk", "We reached 10.5 km, e.g. the ring road"]);
});

test("empty, blank and missing text give no highlights; a single sentence stays one", () => {
    assert.deepEqual(impactPoints(""), []);
    assert.deepEqual(impactPoints("  \n  "), []);
    assert.deepEqual(impactPoints(null), []);
    assert.deepEqual(impactPoints(undefined), []);
    assert.deepEqual(impactPoints("One sentence only"), ["One sentence only"]);
});
