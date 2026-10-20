import assert from "node:assert/strict";
import test from "node:test";
import { academicDepartmentsMatch, academicUnitMatchKeys } from "./universityData";
import { resolveStudentUniversityApplyEligibility } from "./studentOpportunityApplyEligibility";

test("profile programme matches listing department (mirrors backend academicDepartmentsMatch)", () => {
    assert.equal(academicDepartmentsMatch("Computer Science", "BS Computer Science"), true);
    assert.equal(academicDepartmentsMatch("BS Computer Science", "Computer Science"), true);
    assert.equal(academicDepartmentsMatch("Economics", "MPhil Economics"), true);
    assert.equal(academicDepartmentsMatch("School of Computer & Information Technology", "BS Computer Science"), true);
    assert.equal(academicDepartmentsMatch("School of Management Sciences (SMS)", "SMS"), true);
    assert.equal(academicDepartmentsMatch("Management Sciences", "BBA (Hons)"), true);
    assert.equal(academicDepartmentsMatch("Institute of Psychology", "BS Applied Psychology"), true);
    // BNU's Institute of Psychology hosts Applied Psychology, so a "Psychology" listing accepts it.
    assert.equal(academicDepartmentsMatch("Psychology", "BS Applied Psychology"), true);
});

test("different units never match", () => {
    assert.equal(academicDepartmentsMatch("Computer Science", "BS Psychology"), false);
    assert.equal(academicDepartmentsMatch("Economics", "BS Home Economics"), false);
    assert.equal(academicDepartmentsMatch("Computer Science", ""), false);
    assert.deepEqual(academicUnitMatchKeys(""), []);
});

test("Apply Now gate accepts a BS-programme profile on a department-restricted listing", () => {
    const raw = {
        visibility: "restricted",
        restricted_universities: ["Beaconhouse National University (BNU)"],
        participation_scope: {
            rule: "departments_across_universities",
            university_names: ["Beaconhouse National University (BNU)"],
            department_restriction: { scope: "specific", departments: ["Computer Science"] },
        },
    };
    assert.equal(resolveStudentUniversityApplyEligibility(raw, "BNU", "BS Computer Science").canApply, true);
    assert.equal(resolveStudentUniversityApplyEligibility(raw, "BNU", "BS Psychology").canApply, false);
    assert.equal(resolveStudentUniversityApplyEligibility(raw, "LUMS", "BS Computer Science").canApply, false);
});
