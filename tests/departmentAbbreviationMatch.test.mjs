import test from "node:test";
import assert from "node:assert/strict";
import { academicDepartmentsMatch } from "../src/utils/universityData.ts";

// Reported: "MUHAMMAD RAHEEM is in Computer Science, but this opportunity is open to BS CS students only."
test("a listing that writes the programme short form accepts the full department / programme", () => {
    assert.equal(academicDepartmentsMatch("BS CS", "Computer Science"), true);
    assert.equal(academicDepartmentsMatch("BS CS", "BS Computer Science"), true);
    assert.equal(academicDepartmentsMatch("BSCS", "Computer Science"), true);
    assert.equal(academicDepartmentsMatch("CS", "BS Computer Science"), true);
    assert.equal(academicDepartmentsMatch("Computer Science", "BSCS"), true);
    assert.equal(academicDepartmentsMatch("BS SE", "Software Engineering"), true);
    assert.equal(academicDepartmentsMatch("BSIT", "BS Information Technology"), true);
    assert.equal(academicDepartmentsMatch("MS AI", "Artificial Intelligence"), true);
});

test("short forms never let a different department in", () => {
    assert.equal(academicDepartmentsMatch("BS CS", "Software Engineering"), false);
    assert.equal(academicDepartmentsMatch("BS SE", "Computer Science"), false);
    assert.equal(academicDepartmentsMatch("BSIT", "Computer Science"), false);
    assert.equal(academicDepartmentsMatch("BS CS", "BS Psychology"), false);
    // "CE" is ambiguous (civil / computer engineering): not expanded.
    assert.equal(academicDepartmentsMatch("BS CE", "Civil Engineering"), false);
    assert.equal(academicDepartmentsMatch("Computer Science", "Economics"), false);
});

test("frontend and backend keep the same abbreviation table (page never blocks what the API accepts)", async () => {
    const { readFileSync } = await import("node:fs");
    const fe = readFileSync(new URL("../src/utils/universityData.ts", import.meta.url), "utf8");
    const be = readFileSync(new URL("../../ciel_backend/src/common/academic-department.util.ts", import.meta.url), "utf8");
    const table = (src) => [...src.matchAll(/^\s+(cs|se|it|ai|ds|ee): ["']([a-z ]+)["'],$/gm)].map((m) => `${m[1]}=${m[2]}`).join(";");
    assert.equal(table(fe), table(be));
    assert.equal(table(fe).split(";").length, 6);
    const compact = (src) => src.match(/const COMPACT_DEGREE_ABBREVIATION =\s*(\/.*\/);/)?.[1];
    assert.equal(compact(fe), compact(be));
});
